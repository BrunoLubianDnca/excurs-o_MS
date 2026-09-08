import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const configPath = resolve(process.argv[2] || 'config/familia-lubian.excursion.json')
const appUrl = (process.env.TREK_SETUP_URL || 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.TREK_SETUP_EMAIL
const password = process.env.TREK_SETUP_PASSWORD

function fail(message) {
  console.error(`[excursion-setup] ${message}`)
  process.exitCode = 1
}

function assertConfig(config) {
  if (!config?.trip?.title || !config.trip.start_date || !config.trip.end_date) {
    throw new Error('A configuração precisa de trip.title, trip.start_date e trip.end_date.')
  }
  if (!Array.isArray(config.passengers) || config.passengers.length === 0) {
    throw new Error('A configuração precisa conter ao menos um passageiro.')
  }
  for (const name of config.passengers) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 50) {
      throw new Error(`Nome de passageiro inválido: ${JSON.stringify(name)}`)
    }
  }
}

async function main() {
  if (!email || !password) {
    fail('Defina TREK_SETUP_EMAIL e TREK_SETUP_PASSWORD antes de executar.')
    return
  }

  const config = JSON.parse(await readFile(configPath, 'utf8'))
  assertConfig(config)

  let token = ''
  async function request(path, options = {}) {
    const response = await fetch(`${appUrl}/api${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const detail = typeof body?.error === 'string' ? body.error : `${response.status} ${response.statusText}`
      const error = new Error(`${options.method || 'GET'} ${path}: ${detail}`)
      error.status = response.status
      throw error
    }
    return body
  }

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember_me: false }),
  })
  if (login.mfa_required) {
    throw new Error('A conta exige MFA. Entre pelo navegador e use uma conta administrativa temporária sem MFA para executar o inicializador.')
  }
  if (!login.token) throw new Error('O login não retornou um token de sessão.')
  token = login.token

  if (config.map?.provider && config.map?.style) {
    await request('/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({
        settings: {
          map_provider: config.map.provider,
          maplibre_style: config.map.style,
        },
      }),
    })
    console.log('[excursion-setup] Mapa vetorial OpenFreeMap Bright configurado para esta conta.')
  }

  const listed = await request('/trips')
  const tripPayload = {
    title: config.trip.title,
    description: config.trip.description ?? null,
    start_date: config.trip.start_date,
    end_date: config.trip.end_date,
    currency: config.trip.currency || 'BRL',
    ...(Number.isInteger(config.trip.day_count) ? { day_count: config.trip.day_count } : {}),
  }
  let trip = listed.trips?.find(candidate =>
    candidate.title === config.trip.title &&
    candidate.start_date === config.trip.start_date &&
    candidate.end_date === config.trip.end_date
  )

  if (!trip) {
    const created = await request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripPayload),
    })
    trip = created.trip
    console.log(`[excursion-setup] Viagem criada: ${trip.title} (#${trip.id}).`)
  } else {
    const updated = await request(`/trips/${trip.id}`, {
      method: 'PUT',
      body: JSON.stringify(tripPayload),
    })
    trip = updated.trip
    console.log(`[excursion-setup] Viagem existente sincronizada: ${trip.title} (#${trip.id}).`)
  }

  let roster = await request(`/trips/${trip.id}/members`)
  const existingNames = new Map()
  for (const member of roster.members || []) {
    if (!member.is_guest) continue
    const name = member.username.trim().toLocaleLowerCase('pt-BR')
    existingNames.set(name, (existingNames.get(name) || 0) + 1)
  }

  const wantedNames = new Map()
  let guestsCreated = 0
  for (const rawName of config.passengers) {
    const name = rawName.trim()
    const key = name.toLocaleLowerCase('pt-BR')
    const occurrence = (wantedNames.get(key) || 0) + 1
    wantedNames.set(key, occurrence)
    if ((existingNames.get(key) || 0) >= occurrence) continue
    await request(`/trips/${trip.id}/guests`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    guestsCreated += 1
  }
  console.log(`[excursion-setup] Passageiros: ${config.passengers.length}; novos convidados: ${guestsCreated}.`)
  if (guestsCreated > 0) roster = await request(`/trips/${trip.id}/members`)

  if (config.transport) {
    try {
      const budget = await request(`/trips/${trip.id}/budget`)
      const existing = budget.items?.find(item => item.name === config.transport.name)
      if (!existing) {
        await request(`/trips/${trip.id}/budget`, {
          method: 'POST',
          body: JSON.stringify(config.transport),
        })
        console.log(`[excursion-setup] Custo de transporte criado: R$ ${config.transport.total_price.toFixed(2)}.`)
      } else {
        await request(`/trips/${trip.id}/budget/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify(config.transport),
        })
        console.log('[excursion-setup] Custo de transporte existente sincronizado.')
      }
    } catch (error) {
      if (error.status === 404) {
        console.warn('[excursion-setup] Addon de custos desativado; ative-o e execute novamente para incluir o ônibus.')
      } else {
        throw error
      }
    }
  }

  let days = null
  const getDays = async () => {
    if (!days) days = await request(`/trips/${trip.id}/days`)
    return days.days || []
  }

  if (config.locations && typeof config.locations === 'object') {
    const listedPlaces = await request(`/trips/${trip.id}/places`)
    const placesByName = new Map((listedPlaces.places || []).map(place => [place.name, place]))
    let placesSynced = 0
    let assignmentsCreated = 0

    for (const location of Object.values(config.locations)) {
      if (!location?.name) continue
      const placePayload = {
        name: location.name,
        description: location.description ?? null,
        address: location.address ?? null,
        lat: location.latitude,
        lng: location.longitude,
        notes: location.notes ?? null,
        website: location.maps_url ?? null,
      }
      const existing = placesByName.get(location.name)
      const result = existing
        ? await request(`/trips/${trip.id}/places/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify(placePayload),
          })
        : await request(`/trips/${trip.id}/places`, {
            method: 'POST',
            body: JSON.stringify(placePayload),
          })
      const place = result.place
      placesByName.set(location.name, place)
      placesSynced += 1

      if (!location.day_date) continue
      const day = (await getDays()).find(candidate => candidate.date === location.day_date)
      if (!day) throw new Error(`Dia ${location.day_date} não encontrado para o local ${location.name}.`)
      const listedAssignments = await request(`/trips/${trip.id}/days/${day.id}/assignments`)
      const assigned = (listedAssignments.assignments || []).some(assignment =>
        Number(assignment.place?.id ?? assignment.place_id) === Number(place.id)
      )
      if (!assigned) {
        await request(`/trips/${trip.id}/days/${day.id}/assignments`, {
          method: 'POST',
          body: JSON.stringify({ place_id: place.id, notes: location.assignment_notes ?? null }),
        })
        assignmentsCreated += 1
      }
    }
    console.log(`[excursion-setup] Pontos do mapa sincronizados: ${placesSynced}; novos vínculos no roteiro: ${assignmentsCreated}.`)
  }

  if (config.booking?.title) {
    const tripDays = await getDays()
    const startDay = tripDays.find(day => day.date === config.booking.start_date)
    const endDay = tripDays.find(day => day.date === config.booking.end_date)
    if (!startDay || !endDay) {
      throw new Error('As datas inicial e final da reserva do ônibus precisam existir no período da viagem.')
    }

    const bookingPayload = {
      title: config.booking.title,
      type: config.booking.type || 'bus',
      status: config.booking.status || 'pending',
      day_id: startDay.id,
      end_day_id: endDay.id,
      reservation_time: config.booking.start_date,
      reservation_end_time: config.booking.end_date,
      location: config.booking.location ?? null,
      notes: config.booking.notes ?? null,
      url: config.booking.url ?? null,
      endpoints: config.booking.endpoints || [],
    }
    const listedReservations = await request(`/trips/${trip.id}/reservations`)
    const existing = (listedReservations.reservations || []).find(item => item.title === config.booking.title)
    const result = existing
      ? await request(`/trips/${trip.id}/reservations/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify(bookingPayload),
        })
      : await request(`/trips/${trip.id}/reservations`, {
          method: 'POST',
          body: JSON.stringify(bookingPayload),
        })

    if (config.booking.traveler_scope === 'passengers') {
      const guestIds = (roster.members || [])
        .filter(member => member.is_guest)
        .map(member => Number(member.id))
        .filter(Number.isInteger)
      await request(`/trips/${trip.id}/reservations/${result.reservation.id}/travelers`, {
        method: 'PUT',
        body: JSON.stringify({ user_ids: guestIds }),
      })
      console.log(`[excursion-setup] Reserva do ônibus sincronizada com ${guestIds.length} passageiros.`)
    } else {
      console.log('[excursion-setup] Reserva do ônibus sincronizada.')
    }
  }

  if (Array.isArray(config.tasks) && config.tasks.length > 0) {
    try {
      const todo = await request(`/trips/${trip.id}/todo`)
      const existingTasks = new Set((todo.items || []).map(item => item.name))
      let tasksCreated = 0
      for (const name of config.tasks) {
        if (existingTasks.has(name)) continue
        await request(`/trips/${trip.id}/todo`, {
          method: 'POST',
          body: JSON.stringify({ name, category: 'Organização', priority: 2 }),
        })
        tasksCreated += 1
      }
      console.log(`[excursion-setup] Tarefas de organização criadas: ${tasksCreated}.`)
    } catch (error) {
      if (error.status === 404) {
        console.warn('[excursion-setup] Addon de listas desativado; ative-o e execute novamente para incluir as tarefas.')
      } else {
        throw error
      }
    }
  }

  console.log(`[excursion-setup] Pronto: abra ${appUrl}/trips/${trip.id}`)
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)))

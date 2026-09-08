export type Coordinates = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type Transport = {
  company: string;
  vehicle: string;
  capacity: number;
  departure_time: string | null;
  return_time: string | null;
  payment_deadline: string;
  payment_methods: string;
  notes: string;
};

export type FamilyTrip = {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  currency: string;
  origin: Coordinates;
  destination: Coordinates;
  transport: Transport;
};

export type Passenger = {
  id: number;
  trip_id: string;
  name: string;
  full_name: string;
  cpf: string;
  phone: string;
  emergency_contact: string;
  age_group: 'adult' | 'child' | 'unknown';
  confirmed: boolean;
  seat_no: number | null;
  notes: string;
  sort_order: number;
};

export type TripTask = {
  id: number;
  trip_id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'high' | 'normal' | 'low';
  due_date: string | null;
  sort_order: number;
};

export type TripCost = {
  id: number;
  trip_id: string;
  name: string;
  amount: number;
  status: 'planned' | 'paid';
  due_date: string | null;
  notes: string;
};

export type Screen = 'summary' | 'passengers' | 'tasks' | 'costs' | 'trip';

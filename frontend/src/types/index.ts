export type UserRole = "driver" | "operator" | "admin";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  profile_image?: string;
  created_at: string;
}

export type ChargerType = "AC_Type2" | "CCS" | "CHAdeMO" | "GB_T";

export interface Vehicle {
  id: number;
  owner_id: number;
  name: string;
  manufacturer: string;
  model: string;
  battery_capacity_kwh: number;
  remaining_battery_percent: number;
  charger_type: ChargerType;
  vehicle_range_km: number;
  charging_speed_kw: number;
  is_default: boolean;
  created_at: string;
}

export type ChargerStatus = "available" | "occupied" | "faulty" | "maintenance" | "offline";

export interface Charger {
  id: number;
  charger_code: string;
  charger_type: ChargerType;
  power_kw: number;
  status: ChargerStatus;
  failure_risk_score: number;
  remaining_useful_life_days: number;
}

export interface Station {
  id: number;
  name: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  total_chargers: number;
  charging_cost_per_kwh: number;
  reliability_score: number;
  average_rating: number;
  green_energy_percent: number;
  is_24_7: boolean;
  amenities: string[];
  chargers: Charger[];
}

export interface StationNearby {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  available_chargers: number;
  total_chargers: number;
  charging_cost_per_kwh: number;
  reliability_score: number;
}

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface Booking {
  id: number;
  user_id: number;
  vehicle_id: number;
  station_id: number;
  charger_id: number;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  qr_code?: string;
  predicted_wait_minutes?: number;
  created_at: string;
}

export interface QueuePrediction {
  station_id: number;
  current_queue: number;
  queue_15min: number;
  queue_30min: number;
  queue_1hr: number;
  queue_2hr: number;
  peak_hour_queue: number;
}

export interface WaitingPrediction {
  station_id: number;
  waiting_minutes: number;
  expected_start_time: string;
  expected_completion_time: string;
}

export interface DemandForecast {
  station_id: number;
  horizon: string;
  forecast: number[];
  timestamps: string[];
}

export interface RecommendationItem {
  station_id: number;
  station_name: string;
  score: number;
  distance_km: number;
  predicted_wait_minutes: number;
  charging_cost_per_kwh: number;
  reachable: boolean;
  reasons: string[];
}

export interface CarbonFootprint {
  energy_consumed_kwh: number;
  carbon_saved_kg: number;
  trees_equivalent: number;
  green_energy_used_percent: number;
  monthly_sustainability_score: number;
}

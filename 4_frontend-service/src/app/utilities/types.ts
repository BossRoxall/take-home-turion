export interface CCSD_Packet {
  id: number;
  apid: number;
  seq_flags: number;
  seq_count: number;
  timestamp: string;
  subsystem_id: number;
  altitude: number;
  battery: number;
  signal: number;
  temperature: number;
}

export interface AggregateObject {
  minimum: number;
  maximum: number;
  average: number;
}

export interface Aggregate_CCSD {
  altitude: AggregateObject;
  battery: AggregateObject;
  signal: AggregateObject;
  temperature: AggregateObject;
}

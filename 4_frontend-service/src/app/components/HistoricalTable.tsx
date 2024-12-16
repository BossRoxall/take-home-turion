"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/app/page.module.css";

// Utilities
import clsx from "clsx";
import api from "@/app/utilities/apis";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Components
import { Col, Row, Table } from "reactstrap";

// Types
import { CCSD_Packet } from "@/app/utilities/types";

interface HistoricalOptions {
  startTime: Date;
  endTime: Date;
}

interface GraphOptions {
  measurement: string;
  data: CCSD_Packet[];
  config: {
    referenceLine: number;
    units: string;
  };
}

// Constants
const GraphConfigs = {
  altitude: {
    referenceLine: 400,
    units: "km",
  },
  battery: {
    referenceLine: 40,
    units: "%",
  },
  signal: {
    referenceLine: -80,
    units: "db",
  },
  temperature: {
    referenceLine: 35,
    units: "°C",
  },
};

// TODO: Pagination, Sorting
export default function HistoricalTable({
  startTime,
  endTime,
}: HistoricalOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<CCSD_Packet[] | null>(
    null,
  );

  const refreshHistoricalData = useCallback(() => {
    if (isLoading) {
      return; // Prevent duplicate calls
    }

    setIsLoading(true);
    const params = new URLSearchParams({
      start_time: startTime.toJSON(),
      end_time: endTime.toJSON(),
    });

    api
      .get(`/telemetry?${params}`)
      .then(({ data: response }) => {
        if (response) {
          setHistoricalData(response.data);
        }
      })
      .catch((error) => console.error("Error getting historical data", error))
      .finally(() => setIsLoading(false));
  }, [startTime, endTime, isLoading]);

  useEffect(() => {
    refreshHistoricalData();
  }, [startTime, endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!historicalData) {
    return <div>Loading Historical...</div>;
  }

  return (
    <div>
      <h3>Historical Graphs</h3>

      <Row>
        {Object.entries(GraphConfigs).map(([label, config]) => (
          <Col key={label} sm={12} xl={6}>
            <h4 className="text-capitalize text-center">{label}</h4>

            <MeasurementGraph
              measurement={label}
              data={historicalData}
              config={config}
            />
          </Col>
        ))}
      </Row>

      <h3>Historical Data Table</h3>

      <ul>
        <li>Pulls 50 Rows</li>
        <li>Newest First</li>
        <li>Rows with Anomalous Data are highlighted in Yellow</li>
        <li>Anomalous Data Cells are highlighted in Red</li>
      </ul>

      <Table responsive striped style={{ maxHeight: "30%" }}>
        <thead>
          <tr>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              ID
            </td>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              APID
            </td>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              Seq Flags
            </td>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              Seq Count
            </td>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              Subsystem ID
            </td>
            <td rowSpan={2} className={styles.rowVerticalAlign}>
              Timestamp
            </td>
            <td colSpan={4} style={{ textAlign: "center" }}>
              Measurements
            </td>
          </tr>
          <tr>
            <td>Battery</td>
            <td>Altitude</td>
            <td>Signal</td>
            <td>Temperature</td>
          </tr>
        </thead>
        <tbody>
          <TableData historical={historicalData} />
        </tbody>
      </Table>
    </div>
  );
}

function MeasurementGraph({ measurement, data, config }: GraphOptions) {
  if (!data || !data.length) {
    return;
  }

  return (
    <LineChart
      width={550}
      height={300}
      data={data.toReversed()}
      syncId="id"
      syncMethod="value"
    >
      <Line
        type="monotone"
        dataKey={measurement}
        stroke="#8884d8"
        isAnimationActive={false}
      />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="timestamp" tickFormatter={(date) => format(date, "pp")} />
      <YAxis unit={config.units} />
      <Tooltip />
      {measurement === "temperature" ? (
        <ReferenceArea
          y1={config.referenceLine}
          stroke="red"
          strokeOpacity={0.3}
          label="Anomoly Threshold"
        />
      ) : (
        <ReferenceArea
          y2={config.referenceLine}
          stroke="red"
          strokeOpacity={0.3}
          label="Anomoly Threshold"
        />
      )}
    </LineChart>
  );
}

function TableData({ historical }: { historical: CCSD_Packet[] }) {
  if (!historical.length) {
    return (
      <tr>
        <td colSpan={10} style={{ textAlign: "center" }}>
          No Data...
        </td>
      </tr>
    );
  }

  return historical?.map((record) => {
    const isAnomaly = checkForAnomaly(record);
    return (
      <tr key={record.id} className={clsx({ "table-warning": isAnomaly })}>
        <td>{record.id}</td>
        <td>{record.apid}</td>
        <td>{record.seq_flags}</td>
        <td>{record.seq_count}</td>
        <td>{record.subsystem_id}</td>
        <td>{format(record.timestamp, "Pp")}</td>
        <td className={clsx({ "table-danger": isAnomaly === "altitude" })}>
          {record.altitude.toFixed(2)}
        </td>
        <td className={clsx({ "table-danger": isAnomaly === "battery" })}>
          {record.battery.toFixed(2)}
        </td>
        <td className={clsx({ "table-danger": isAnomaly === "signal" })}>
          {record.signal.toFixed(2)}
        </td>
        <td
          className={clsx({
            "table-danger": isAnomaly === "temperature",
          })}
        >
          {record.temperature.toFixed(2)}
        </td>
      </tr>
    );
  });
}

function checkForAnomaly(record: CCSD_Packet): string | undefined {
  if (record.altitude < 400) {
    return "altitude";
  }
  if (record.battery < 40) {
    return "battery";
  }
  if (record.signal < -80) {
    return "signal";
  }
  if (record.temperature > 35) {
    return "temperature";
  }
}

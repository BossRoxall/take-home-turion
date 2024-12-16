"use client";

import { useState, useEffect } from "react";
import { Aggregate_CCSD } from "@/app/utilities/types";

// Utilities
import clsx from "clsx";
import api from "@/app/utilities/apis";

// Styles
import { Table } from "reactstrap";

// Constants
const columns = ["minimum", "maximum", "average"];

// Types
interface AggregateOptions {
  startTime: Date;
  endTime: Date;
}

export default function AggregateTable({
  startTime,
  endTime,
}: AggregateOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [aggregate, setAggregate] = useState<Aggregate_CCSD | null>(null);

  useEffect(() => {
    if (isLoading) {
      return; // Prevent duplicate calls
    }

    setIsLoading(true);

    const params = new URLSearchParams({
      start_time: startTime.toJSON(),
      end_time: endTime.toJSON(),
    });

    api
      .get(`/telemetry/aggregate?${params}`)
      .then(({ data: response }) => {
        if (response) {
          setAggregate(response.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [startTime, endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h3>Aggregated Telemetry Data</h3>

      <p>
        Table showing the minimum, maximum, and average values for each
        measurement in the requested time period.
      </p>
      <Table responsive striped>
        <thead>
          <tr>
            <td>Measurement</td>
            {columns.map((measurement, index) => (
              <td key={index} className="text-capitalize">
                {measurement}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <TableData aggregate={aggregate} />
        </tbody>
      </Table>
    </div>
  );
}

function TableData({ aggregate }: { aggregate: Aggregate_CCSD | null }) {
  if (!aggregate || !Object.keys(aggregate).length) {
    return (
      <tr>
        <td colSpan={4} className="text-center">
          No Data...
        </td>
      </tr>
    );
  }

  return Object.entries(aggregate).map(([label, measurements]) => (
    <tr key={`${label}_measurements`}>
      <td className="text-capitalize">
        <strong>{label}</strong>
      </td>
      <td
        className={clsx({
          "table-danger": checkForAnomaly(label, measurements.minimum),
        })}
      >
        {measurements.minimum.toFixed(2)}
      </td>
      <td
        className={clsx({
          "table-danger": checkForAnomaly(label, measurements.maximum),
        })}
      >
        {measurements.maximum.toFixed(2)}
      </td>
      <td
        className={clsx({
          "table-danger": checkForAnomaly(label, measurements.average),
        })}
      >
        {measurements.average.toFixed(2)}
      </td>
    </tr>
  ));
}

function checkForAnomaly(label: string, measurement: number): boolean {
  if (label === "altitude" && measurement < 400) {
    return true;
  }
  if (label === "battery" && measurement < 40) {
    return true;
  }
  if (label === "signal" && measurement < -80) {
    return true;
  }
  if (label === "temperature" && measurement > 35) {
    return true;
  }
  return false;
}

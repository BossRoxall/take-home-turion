"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CCSD_Packet } from "@/app/utilities/types";
import api from "@/app/utilities/apis";

// Styles
import styles from "../page.module.css";

// Types
interface CurrentOptions {
  endTime: Date;
  pollInterval: number;
}

export default function CurrentTelemetry({
  endTime,
  pollInterval,
}: CurrentOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState<CCSD_Packet | null>(null);

  const refreshData = useCallback(() => {
    if (isLoading) {
      return; // Prevent duplicate calls
    }

    setIsLoading(true);
    api
      .get(`/telemetry/current`)
      .then(({ data: response }) => {
        if (response) {
          setCurrent(response.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [isLoading]);

  // Trigger refresh when endTime changes
  useEffect(() => {
    refreshData();
    const currentInterval = setInterval(refreshData, pollInterval);

    return () => {
      clearInterval(currentInterval);
    };
  }, [endTime, pollInterval, refreshData]);

  return (
    <div>
      <h3>Live Telemetry Data</h3>

      <p>Always pulls the most recent record.</p>

      <TelemetryRecord current={current} />
    </div>
  );
}

interface TelemetryRecordOptions {
  current: CCSD_Packet | null;
}

function TelemetryRecord({ current }: TelemetryRecordOptions) {
  if (!current) {
    return <div>No Data...</div>;
  }

  return (
    <div className={styles.refreshIndicator} style={{ width: "500px" }}>
      <pre>
        <code>{JSON.stringify(current, null, 2)}</code>
      </pre>
    </div>
  );
}

"use client";

import "bootstrap/dist/css/bootstrap.min.css"; // Import bootstrap CSS
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";
import styles from "./page.module.css";

// Components
import { useEffect, useState } from "react";
import { sub } from "date-fns";
import DateTimePicker from "react-datetime-picker";
import { FaArrowRotateLeft } from "react-icons/fa6";
import CurrentTelemetry from "@/app/components/CurrentTelemetry";
import HistoricalTable from "@/app/components/HistoricalTable";
import AggregateTable from "@/app/components/AggregateTable";
import {
  Alert,
  Button,
  Col,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Row,
  InputGroup,
  InputGroupText,
} from "reactstrap";

const DEFAULT_POLL_INTERVAL_MS = 5000;

export default function Home() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pollInterval, setPollInterval] = useState(DEFAULT_POLL_INTERVAL_MS);
  const [pollCountDown, setPollCountDown] = useState(pollInterval / 1000);

  // Time range handling
  const currentTS = new Date();
  const [startTime, setStartTime] = useState(sub(currentTS, { hours: 1 }));
  const [endTime, setEndTime] = useState(currentTS);
  const [userSelectedRange, setUserSelectedRange] = useState(false);

  const toggle = () => setDropdownOpen((prevState) => !prevState);

  // Handle countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (pollInterval === 1000) {
        setEndTime(new Date()); // Update every second while
      } else {
        setPollCountDown((prevCount) =>
          prevCount > 1 ? prevCount - 1 : pollInterval / 1000,
        );
      }
    }, 1000); // Countdown every second

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [pollInterval]);

  // Reset current count when countdownLimit changes
  useEffect(() => {
    setPollCountDown(pollInterval / 1000);
  }, [pollInterval]);

  // Trigger refresh by changing endDate
  useEffect(() => {
    if (userSelectedRange) {
      console.log("User selected range");
      return; // noop while user is controlling date range
    }
    if (pollCountDown === pollInterval / 1000) {
      setEndTime(new Date()); // Trigger data refresh
      setPollCountDown(pollInterval / 1000); // Reset countdown
    }
  }, [pollCountDown]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {userSelectedRange ? (
          <Alert color="warning">
            User has selected a static range. Automatic refresh is paused for
            all fields except the Live Telemetry Data.
            <br />
            Click either &#34;Reset to Default buttons&#34; (<FaArrowRotateLeft />) to
            re-enable automatic refresh.
          </Alert>
        ) : (
          <Alert color="warning">
            Panels will automatically refresh at the selected Refresh Rate
            unless you select a static datetime using the provided inputs.
          </Alert>
        )}
        <Row>
          <Col sm={12} md={5}>
            <InputGroup>
              <InputGroupText>Start</InputGroupText>
              <DateTimePicker
                aria-label="Historical Data Search Start Range"
                clearIcon={null}
                value={startTime}
                onChange={(dateTime) => {
                  setStartTime(dateTime!);
                  setUserSelectedRange(true);
                }}
              />
              <Button
                onClick={() => {
                  setStartTime(sub(new Date(), { hours: 1 }));
                  setUserSelectedRange(false);
                }}
              >
                <FaArrowRotateLeft />
              </Button>
            </InputGroup>
            <small>Default: 1 Hour Ago</small>
          </Col>

          <Col sm={12} md={5}>
            <InputGroup className="ms-md-auto mt-sm-2 mt-md-0">
              <InputGroupText>End</InputGroupText>
              <DateTimePicker
                aria-label="Historical Data Search End Range"
                clearIcon={null}
                value={endTime}
                onChange={(dateTime) => {
                  setEndTime(dateTime!);
                  setUserSelectedRange(true);
                }}
              />
              <Button
                onClick={() => {
                  setEndTime(new Date());
                  setUserSelectedRange(false);
                }}
              >
                <FaArrowRotateLeft />
              </Button>
            </InputGroup>
            <small>Default: Current Time</small>
          </Col>

          <Col>
            <Dropdown isOpen={dropdownOpen} toggle={toggle} direction="down">
              <DropdownToggle>Refresh Rate: {pollCountDown}s</DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={() => setPollInterval(1000)}>
                  1 second
                </DropdownItem>
                <DropdownItem onClick={() => setPollInterval(5000)}>
                  5 seconds
                </DropdownItem>
                <DropdownItem onClick={() => setPollInterval(10000)}>
                  10 seconds
                </DropdownItem>
                <DropdownItem onClick={() => setPollInterval(30000)}>
                  30 seconds
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>

        <Row>
          <Col sm={12} xl={6}>
            <CurrentTelemetry pollInterval={pollInterval} endTime={endTime} />
          </Col>
          <Col sm={12} xl={6}>
            <AggregateTable startTime={startTime} endTime={endTime} />
          </Col>
        </Row>

        <HistoricalTable startTime={startTime} endTime={endTime} />
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}

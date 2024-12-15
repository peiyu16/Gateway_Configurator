import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardEvent = () => {
  // State to hold the events data and loading state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch events from both APIs when the component mounts
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const [ioEventsResponse, eventsResponse] = await Promise.all([
          axios.get('http://raspberrypi.local:5000/api/events'),    // Fetch from events API
          axios.get('http://raspberrypi.local:5000/api/ioevents') // Fetch from ioevents API
        ]);

        // Combine both event data
        const allEvents = [...ioEventsResponse.data, ...eventsResponse.data];
        setEvents(allEvents); // Store combined events in state
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchEvents();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Automated Event List</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            <div>
              {events.length > 0 ? (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Description</th>
                      <th>Trigger Point</th>
                      <th>Trigger Execution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, index) => (
                      <tr key={index}>
                        <td>{event.eventName}</td>
                        <td>{event.eventDescribe || '--'}</td>
                        <td>{event.triggerPoint}</td>
                        <td>{event.triggerExecution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No events found.</p> // Display message if no events are found
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardEvent;

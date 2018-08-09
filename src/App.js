import React, { Component } from 'react';
import Papa from 'papaparse';
import ROTATIONS from './csv/rotations.csv';
import SPOTS from './csv/spots.csv';

import {
  Container,
  Col,
  Row,
  Table
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.css';

const parseCsv = (name, FILE) => {
  return new Promise((resolve, reject) => {
    Papa.parse(FILE, {
      download: true,
      header: true,
      complete(results) {
        if (results.errors.length === 0) {
          const { data } = results;
          resolve({ name, data });
        } else {
          const { errors } = results;
          reject(errors);
        }
      }
    });
  });
};

const calcCpv = (totalSpend, views) => (totalSpend / views).toFixed(2);

const calcDayRotationCpv = (day, rotation, creatives) => {
  const { Name, Start, End } = rotation;
  const rotationStart = new Date(`${day} ${Start}`);
  const rotationEnd = new Date(`${day} ${End}`);
  const rotationCreatives = creatives.filter(creative => {
    const creativeDate = new Date(`${day} ${creative.Time}`);
    return (creativeDate >= rotationStart && creativeDate <= rotationEnd);
  });
  const spend = [...rotationCreatives].reduce((total, {Spend}) => {
    return Number(total) + Number(Spend);
  }, 0);
  const views = [...rotationCreatives].reduce((total, {Views}) => {
    return Number(total) + Number(Views);
  }, 0);
  return { rotation: Name, spend, views, cpv: calcCpv(spend, views) };
};

const calcRotationCpv = (rotations, creatives) => {
  const days = [...new Set(creatives.map(({Date}) => Date))];
  const dayRotations = days.map(day => {
    const dayCreatives = [...creatives.filter(creative => day === creative.Date)];
    const rotationCpv = rotations.map(rotation => (
      calcDayRotationCpv(day, rotation, dayCreatives)
    ));
    return { day, rotations: rotationCpv };
  });
  return dayRotations;
}

const csv_files = [
  parseCsv('rotations', ROTATIONS),
  parseCsv('spots', SPOTS),
];

class App extends Component {
  constructor() {
    super();
    this.state = {
      rotationsByDay: [],
      creatives: [],
    }
  }

  componentDidMount() {
    Promise.all(csv_files)
      .then(csv => {
        const rotations = [...csv.filter(({name}) => name === 'rotations')[0].data];
        const spots = [...csv.filter(({name}) => name === 'spots')[0].data];
        const creatives = spots.map(creative => {
          const { Spend, Views } = creative;
          return Object.assign({}, creative, { cpv: calcCpv(Spend, Views) });
        });
        const rotationsByDay = calcRotationCpv(rotations, spots);
        this.setState({ creatives, rotationsByDay });
      })
      .catch(error => console.log(error));
  }

  render() {
    const { creatives, rotationsByDay } = this.state;

    return (
      <Container className="pt-5">
        <Row>
          <Col sm="12" md="8" className="px-5">
            <h1 className="font-weight-bold mb-4">
              CPV by Creative
            </h1>
            <Table>
              <thead>
                <tr>
                  {
                    (creatives.length >= 1) &&
                    Object.keys(creatives[0]).map(name => (
                      <th key={name}>{name}</th>
                    ))
                  }
                </tr>
              </thead>
              <tbody>
                {
                  creatives.map(creative => (
                    <tr key={creative.Date + creative.Time}>
                      {
                        Object.keys(creative).map(key => (
                          <td key={key}>
                            {creative[key]}
                          </td>
                        ))
                      }
                    </tr>
                  ))
                }
              </tbody>
            </Table>
          </Col>
          <Col sm="12" md="4" className="px-5 px-md-3">
            <h1 className="font-weight-bold mb-4 border-bottom pb-4">
              CPV by Rotations
            </h1>
            {
              rotationsByDay.map(date => (
                <div key={date.day} className="border rounded mb-3 p-3">
                  <h2 className="h5 font-weight-bold">
                    {date.day}
                  </h2>
                  <Table>
                    <thead>
                      <tr>
                        {
                          (date.rotations.length >= 1) &&
                          Object.keys(date.rotations[0]).map(name => (
                            <th key={name}>{name}</th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {
                        date.rotations.map(rotation => (
                          <tr key={rotation.rotation}>
                            {
                              Object.keys(rotation).map(key => (
                                <td key={key}>
                                  {rotation[key]}
                                </td>
                              ))
                            }
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                </div>
              ))
            }

          </Col>

        </Row>
      </Container>
    );
  }
}

export default App;

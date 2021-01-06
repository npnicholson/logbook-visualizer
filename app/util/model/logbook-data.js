define((require) => {

    // var dateFNS = require('./util/model/logbook-data');

    class LogbookData {
        constructor({ on_data_changed = undefined } = {}) {
            this.event = {
                data_changed: on_data_changed
            }
            this.running_total = [];
            this.entries = [];
            this.num_entries = 0;
        }

        load(entries) {
            // Set the entries
            this.entries = entries;
            this.num_entries = entries.length;

            // After the entries have been set, calculate the total
            this.calculate_total();

            // If defined, run the data_Changed callback
            if (this.event.data_changed) this.event.data_changed('load');
        }

        parseForeflight(csv_data) {
            try {

                // Calculate the start and end of the aircraft table
                let aircraft_table_start = csv_data.indexOf('\n', csv_data.indexOf('Aircraft Table')) + 1
                let aircraft_table_end = csv_data.indexOf('Flights Table') - 1

                // Parse the aircraft table
                let aircraft_table = Papa.parse(csv_data.substr(aircraft_table_start, aircraft_table_end - aircraft_table_start), { header: true, dynamicTyping: true })

                // Calculate the start of the flights table
                let flights_table_start = csv_data.indexOf('\n', csv_data.indexOf('Flights Table')) + 1

                // Parse the flights table
                let flights_table = Papa.parse(csv_data.substr(flights_table_start, csv_data.length - flights_table_start - 1), { header: true, dynamicTyping: true })

                // Formatter for approaches
                const app_formatter = (app) => {
                    let l = app.split(';');
                    return {
                        airport: l[3],
                        runway: l[2],
                        approach: l[1]
                    };
                }

                // Go through the flights table
                const entries = flights_table.data.map(flight => {
                    // Build the date string in the following format: YYYY-MM-DD hh:mm
                    // If the entry has to TimeOut value, then assume the flight departed at 00:00
                    let date = flight.Date + ' ' + (flight.TimeOut ? flight.TimeOut + ' GMT' : '00:00');

                    let ret = {
                        aircraft: {
                            id: { value: flight.AircraftID, modifier: {} }
                        },

                        // Date is in date object form
                        date: {
                            object: { value: new Date(date), modifier: {} },
                            short: { value: dateFns.format(date, "MM/DD/YY"), modifier: {} },
                            plain: { value: date, modifier: {} },
                        },

                        // Times
                        cross_country: { value: flight.CrossCountry, modifier: {} },
                        ground_training: { value: flight.GroundTraining, modifier: {} },
                        night: { value: flight.Night, modifier: {} },
                        pic: { value: flight.PIC, modifier: {} },
                        sic: { value: flight.SIC, modifier: {} },
                        solo: { value: flight.Solo, modifier: {} },
                        total: { value: flight.TotalTime, modifier: {} },

                        // Set as 0 for now, will revisit later on
                        class: {
                            airplane: {
                                single_engine_land: { value: 0, modifier: {} },
                                multi_engine_land: { value: 0, modifier: {} },
                                single_engine_sea: { value: 0, modifier: {} },
                                multi_engine_sea: { value: 0, modifier: {} }
                            },
                            rotorcraft: {
                                gyroplane: { value: 0, modifier: {} },
                                helicopter: { value: 0, modifier: {} }
                            },
                            glider: { value: 0, modifier: {} },
                            lighter_than_air: {
                                airship: { value: 0, modifier: {} },
                                balloon: { value: 0, modifier: {} }
                            },
                            powered_lift: { value: 0, modifier: {} },
                            powered_parachute: {
                                land: { value: 0, modifier: {} },
                                sea: { value: 0, modifier: {} },
                            },
                            weight_shift_control: {
                                land: { value: 0, modifier: {} },
                                sea: { value: 0, modifier: {} }
                            },
                            simulator: {
                                full: { value: 0, modifier: {} },
                                flight_training_device: { value: 0, modifier: {} },
                                aviation_training_device: { value: 0, modifier: {} }
                            }
                        },

                        // Set as 0 for now, will revisit later on
                        gear: {
                            fixed: {
                                tailwheel: { value: 0, modifier: {} },
                                tricycle: { value: 0, modifier: {} },
                                any: { value: 0, modifier: {} }
                            },
                            retract: {
                                tailwheel: { value: 0, modifier: {} },
                                tricycle: { value: 0, modifier: {} },
                                any: { value: 0, modifier: {} },
                            },
                            amphibian: { value: 0, modifier: {} },
                            floats: { value: 0, modifier: {} },
                            skids: { value: 0, modifier: {} },
                            skis: { value: 0, modifier: {} },
                        },

                        // Instrument flight
                        instrument: {
                            actual: { value: flight.ActualInstrument, modifier: {} },
                            simulated: { value: flight.SimulatedInstrument, modifier: {} },
                        },

                        // Dual flight
                        dual: {
                            given: { value: flight.DualGiven, modifier: {} },
                            received: { value: flight.DualReceived, modifier: {} },
                        },

                        // In/out/on/off times
                        time: {
                            in: { value: flight.TimeIn, modifier: {} },
                            out: { value: flight.TimeOut, modifier: {} },
                            on: { value: flight.TimeOn, modifier: {} },
                            off: { value: flight.TimeOff, modifier: {} },
                        },

                        // Duty Times
                        duty: {
                            on: { value: flight.OnDuty, modifier: {} },
                            off: { value: flight.OffDuty, modifier: {} },
                        },

                        // Empty passenger list
                        passengers: { value: [], modifier: {} },
                        num_passengers: { value: 0, modifier: {} },

                        comments: { value: flight.PilotComments, modifier: {} },

                        // Hobbs start and end 
                        hobbs: {
                            start: { value: flight.HobbsStart, modifier: {} },
                            end: { value: flight.HobbsEnd, modifier: {} },
                        },

                        // Tach start and end
                        tach: {
                            start: { value: flight.TachStart, modifier: {} },
                            end: { value: flight.TachEnd, modifier: {} },
                        },

                        // Route
                        route: {
                            from: { value: flight.From, modifier: {} },
                            via: { value: flight.Route, modifier: {} },
                            to: { value: flight.To, modifier: {} },
                            distance: { value: flight.Distance, modifier: {} },
                        },

                        // Instructor information
                        instructor: {
                            name: { value: flight.InstructorName, modifier: {} },
                            comments: { value: flight.InstructorComments, modifier: {} },
                        },

                        // Operations
                        operations: {
                            landings: {
                                all: { value: flight.AllLandings, modifier: {} },
                                full_stop: {
                                    day: { value: flight.DayLandingsFullStop, modifier: {} },
                                    night: { value: flight.NightLandingsFullStop, modifier: {} },
                                }
                            },
                            takeoffs: {
                                day: { value: flight.DayTakeoffs, modifier: {} },
                                night: { value: flight.NightTakeoffs, modifier: {} },
                                all: { value: flight.DayTakeoffs + flight.NightTakeoffs, modifier: {} },
                            },
                            // Empty approaches list to be filled later
                            approaches_list: { value: [], modifier: {} },
                            approaches: { value: 0, modifier: {} },
                            holds: { value: flight.Holds, modifier: {} },
                        },
                        classifications: {
                            is_checkride: { value: flight.Checkride, modifier: {} },
                            is_flight_review: { value: flight.FlightReview, modifier: {} },
                            is_instrument_proficiency_check: { value: flight.IPC, modifier: {} },
                        }
                    };

                    // Add each of the approaches to the list
                    if (flight.Approach1) ret.operations.approaches_list.value.push(app_formatter(flight.Approach1));
                    if (flight.Approach2) ret.operations.approaches_list.value.push(app_formatter(flight.Approach2));
                    if (flight.Approach3) ret.operations.approaches_list.value.push(app_formatter(flight.Approach3));
                    if (flight.Approach4) ret.operations.approaches_list.value.push(app_formatter(flight.Approach4));
                    if (flight.Approach5) ret.operations.approaches_list.value.push(app_formatter(flight.Approach5));
                    if (flight.Approach6) ret.operations.approaches_list.value.push(app_formatter(flight.Approach6));
                    ret.operations.approaches.value = ret.operations.approaches_list.value.length;

                    // Add each person to the list in object form {name, role}
                    if (flight.Person1) ret.passengers.value.push({ name: flight.Person1.split(';')[0], role: flight.Person1.split(';')[1].toLowerCase() });
                    if (flight.Person2) ret.passengers.value.push({ name: flight.Person2.split(';')[0], role: flight.Person2.split(';')[1].toLowerCase() });
                    if (flight.Person3) ret.passengers.value.push({ name: flight.Person3.split(';')[0], role: flight.Person3.split(';')[1].toLowerCase() });
                    if (flight.Person4) ret.passengers.value.push({ name: flight.Person4.split(';')[0], role: flight.Person4.split(';')[1].toLowerCase() });
                    if (flight.Person5) ret.passengers.value.push({ name: flight.Person5.split(';')[0], role: flight.Person5.split(';')[1].toLowerCase() });
                    if (flight.Person6) ret.passengers.value.push({ name: flight.Person6.split(';')[0], role: flight.Person6.split(';')[1].toLowerCase() });
                    ret.num_passengers.value = ret.passengers.value.length;

                    // Apply aircraft based information, if one is found
                    let craft = aircraft_table.data.find(aircraft => aircraft.AircraftID == flight.AircraftID);

                    // If the aircraft is defined in the list
                    if (craft) {
                        // Assign the aircraft values
                        ret.aircraft.category = { value: craft.Category, modifier: {} };
                        ret.aircraft.class = { value: craft.Class, modifier: {} };
                        ret.aircraft.is_complex = { value: craft.Complex, modifier: {} };
                        ret.aircraft.is_high_performance = { value: craft.HighPerformance, modifier: {} };
                        ret.aircraft.is_pressurized = { value: craft.Pressurized, modifier: {} };
                        ret.aircraft.type = { value: craft.TypeCode, modifier: {} };
                        ret.aircraft.year = { value: craft.Year, modifier: {} };
                        ret.aircraft.make = { value: craft.Make, modifier: {} };
                        ret.aircraft.model = { value: craft.Model, modifier: {} };

                        // Convert the engine type to lower case
                        ret.aircraft.engine = { value: craft.EngineType.toLowerCase(), modifier: {} };
                        ret.aircraft.gear = { value: craft.GearType, modifier: {} };

                        // Set the gear times
                        if (craft.GearType == 'fixed_tailwheel') ret.gear.fixed.tailwheel.value = ret.total.value;
                        else if (craft.GearType == 'fixed_tricycle') ret.gear.fixed.tricycle.value = ret.total.value;
                        else if (craft.GearType == 'retractable_tailwheel') ret.gear.retract.tailwheel.value = ret.total.value;
                        else if (craft.GearType == 'retractable_tricycle') ret.gear.retract.tricycle.value = ret.total.value;
                        else if (craft.GearType == 'amphibian') ret.gear.amphibian.value = ret.total.value;
                        else if (craft.GearType == 'floats') ret.gear.floats.value = ret.total.value;
                        else if (craft.GearType == 'skids') ret.gear.skids.value = ret.total.value;
                        else if (craft.GearType == 'skis') ret.gear.skis.value = ret.total.value;
                        else console.error("Unknown Gear Type: " + craft.GearType);

                        // Set the any gear types 
                        if (craft.GearType == 'fixed_tailwheel' || craft.GearType == 'fixed_tricycle') ret.gear.fixed.any.value = ret.total.value;
                        if (craft.GearType == 'retractable_tailwheel' || craft.GearType == 'retractable_tricycle') ret.gear.retract.any.value = ret.total.value;

                        // Set the aircraft times based on the aircraft class
                        if (craft.Class == 'airplane_single_engine_land') ret.class.airplane.single_engine_land.value = ret.total.value;
                        else if (craft.Class == 'airplane_multi_engine_land') ret.class.airplane.multi_engine_land.value = ret.total.value;
                        else if (craft.Class == 'airplane_single_engine_sea') ret.class.airplane.single_engine_sea.value = ret.total.value;
                        else if (craft.Class == 'airplane_multi_engine_sea') ret.class.airplane.multi_engine_sea.value = ret.total.value;
                        else if (craft.Class == 'rotorcraft_helicopter') ret.class.rotorcraft.helicopter.value = ret.total.value;
                        else if (craft.Class == 'rotorcraft_gyroplane') ret.class.rotorcraft.gyroplane.value = ret.total.value;
                        else if (craft.Class == 'glider') ret.class.glider.value = ret.total.value;
                        else if (craft.Class == 'lighter_than_air_airship') ret.class.lighter_than_air.airship.value = ret.total.value;
                        else if (craft.Class == 'lighter_than_air_balloon') ret.class.lighter_than_air.balloon.value = ret.total.value;
                        else if (craft.Class == 'powered_lift') ret.class.powered_lift.value = ret.total.value;
                        else if (craft.Class == 'powered_parachute_land') ret.class.powered_parachute.land.value = ret.total.value;
                        else if (craft.Class == 'powered_parachute_sea') ret.class.powered_parachute.sea.value = ret.total.value;
                        else if (craft.Class == 'weight_shift_control_land') ret.class.weight_shift_control.land.value = ret.total.value;
                        else if (craft.Class == 'weight_shift_control_sea') ret.class.weight_shift_control.sea.value = ret.total.value;
                        else if (craft.Class == 'full_flight_simulator') ret.class.simulator.full.value = ret.total.value;
                        else if (craft.Class == 'flight_training_device') ret.class.simulator.flight_training_device.value = ret.total.value;
                        else if (craft.Class == 'aviation_training_device') ret.class.simulator.aviation_training_device.value = ret.total.value;
                        else console.error("Unknown Aircraft Class: " + craft.Class);

                    }

                    return ret;
                });

                // Sort the entries in the flight table by date and by time out, if provided
                entries.sort((a, b) => {

                    // A was before B
                    if (a.date.object.value < b.date.object.value) return 1;

                    // A was after B
                    else if (a.date.object.value > b.date.object.value) return -1;

                    // A and B happened on the same date
                    else return 0;
                })

                console.log('Entries', entries);

                this.entries = entries;
                this.num_entries = entries.length;

                // After the entries have been set, calculate the total
                this.calculate_total();

                // If defined, run the data_Changed callback
                if (this.event.data_changed) this.event.data_changed('parse');
            } catch (err) {
                console.error("Malformed Input Data: ", err);
            }
        }

        // Calculates the running total of the logbook by populating this.running_total.
        // Each entry in this list is the total to date for the logbook in each summable metric
        calculate_total() {

            // Clear the running total list, if it has been set before
            this.running_total = [];

            // Grab the oldest entry
            let entry = this.entries[this.entries.length - 1];

            // Write to the oldest running total the contents of the oldest entry
            this.running_total[this.entries.length - 1] = {
                aircraft: {
                    id: { value: entry.aircraft.id.value, modifier: {} },
                },

                // Times
                cross_country: { value: entry.cross_country.value, modifier: {} },
                ground_training: { value: entry.ground_training.value, modifier: {} },
                night: { value: entry.night.value, modifier: {} },
                pic: { value: entry.pic.value, modifier: {} },
                sic: { value: entry.sic.value, modifier: {} },
                solo: { value: entry.solo.value, modifier: {} },
                total: { value: entry.total.value, modifier: {} },

                // Set as 0 for now, will revisit later on
                class: {
                    airplane: {
                        single_engine_land: { value: entry.class.airplane.single_engine_land.value, modifier: {} },
                        multi_engine_land: { value: entry.class.airplane.multi_engine_land.value, modifier: {} },
                        single_engine_sea: { value: entry.class.airplane.single_engine_sea.value, modifier: {} },
                        multi_engine_sea: { value: entry.class.airplane.multi_engine_sea.value, modifier: {} },
                    },
                    rotorcraft: {
                        gyroplane: { value: entry.class.rotorcraft.gyroplane.value, modifier: {} },
                        helicopter: { value: entry.class.rotorcraft.helicopter.value, modifier: {} },
                    },
                    glider: { value: entry.class.glider.value, modifier: {} },
                    lighter_than_air: {
                        airship: { value: entry.class.lighter_than_air.airship.value, modifier: {} },
                        balloon: { value: entry.class.lighter_than_air.balloon.value, modifier: {} },
                    },
                    powered_lift: { value: entry.class.powered_lift.value, modifier: {} },
                    powered_parachute: {
                        land: { value: entry.class.powered_parachute.land.value, modifier: {} },
                        sea: { value: entry.class.powered_parachute.sea.value, modifier: {} },
                    },
                    weight_shift_control: {
                        land: { value: entry.class.weight_shift_control.land.value, modifier: {} },
                        sea: { value: entry.class.weight_shift_control.sea.value, modifier: {} },
                    },
                    simulator: {
                        full: { value: entry.class.simulator.full.value, modifier: {} },
                        flight_training_device: { value: entry.class.simulator.flight_training_device.value, modifier: {} },
                        aviation_training_device: { value: entry.class.simulator.aviation_training_device.value, modifier: {} },
                    }
                },

                gear: {
                    fixed: {
                        tailwheel: { value: entry.gear.fixed.tailwheel.value, modifier: {} },
                        tricycle: { value: entry.gear.fixed.tricycle.value, modifier: {} },
                        any: { value: entry.gear.fixed.any.value, modifier: {} },
                    },
                    retract: {
                        tailwheel: { value: entry.gear.retract.tailwheel.value, modifier: {} },
                        tricycle: { value: entry.gear.retract.tricycle.value, modifier: {} },
                        any: { value: entry.gear.retract.any.value, modifier: {} },
                    },
                    amphibian: { value: entry.gear.amphibian.value, modifier: {} },
                    floats: { value: entry.gear.floats.value, modifier: {} },
                    skids: { value: entry.gear.skids.value, modifier: {} },
                    skis: { value: entry.gear.skis.value, modifier: {} },
                },

                // Instrument flight
                instrument: {
                    actual: { value: entry.instrument.actual.value, modifier: {} },
                    simulated: { value: entry.instrument.simulated.value, modifier: {} },
                },

                // Dual flight
                dual: {
                    given: { value: entry.dual.given.value, modifier: {} },
                    received: { value: entry.dual.received.value, modifier: {} },
                },

                // Duty Times
                duty: {
                    on: { value: entry.duty.on.value, modifier: {} },
                    off: { value: entry.duty.off.value, modifier: {} },
                },

                // Number of Passengers
                num_passengers: { value: entry.num_passengers.value, modifier: {} },

                // Hobbs start and end 
                hobbs: {
                    start: { value: entry.hobbs.start.value, modifier: {} },
                    end: { value: entry.hobbs.end.value, modifier: {} },
                },

                // Tach start and end
                tach: {
                    start: { value: entry.tach.start.value, modifier: {} },
                    end: { value: entry.tach.end.value, modifier: {} },
                },

                // Route
                route: {
                    distance: { value: entry.route.distance.value, modifier: {} },
                },

                // Operations
                operations: {
                    landings: {
                        all: { value: entry.operations.landings.all.value, modifier: {} },
                        full_stop: {
                            day: { value: entry.operations.landings.full_stop.day.value, modifier: {} },
                            night: { value: entry.operations.landings.full_stop.night.value, modifier: {} },
                        }
                    },
                    takeoffs: {
                        day: { value: entry.operations.takeoffs.day.value, modifier: {} },
                        night: { value: entry.operations.takeoffs.night.value, modifier: {} },
                        all: { value: entry.operations.takeoffs.all.value, modifier: {} },
                    },
                    // Empty approaches list to be filled later
                    approaches: { value: entry.operations.approaches.value, modifier: {} },
                    holds: { value: entry.operations.holds.value, modifier: {} },
                },
            };

            // Sum all of the entries, starting from the second-to-oldest (we already included)
            // the oldest above
            for (let idx = this.entries.length - 2; idx >= 0; idx--) {
                // Get the current entry by index
                let entry = this.entries[idx];
                // Get the last entry in the running_total list
                let last = this.running_total[idx + 1];

                // Set this running_total entry
                this.running_total[idx] = {

                    // Times
                    cross_country: { value: roundToTwo(entry.cross_country.value + last.cross_country.value), modifier: {} },
                    ground_training: { value: roundToTwo(entry.ground_training.value + last.ground_training.value), modifier: {} },
                    night: { value: roundToTwo(entry.night.value + last.night.value), modifier: {} },
                    pic: { value: roundToTwo(entry.pic.value + last.pic.value), modifier: {} },
                    sic: { value: roundToTwo(entry.sic.value + last.sic.value), modifier: {} },
                    solo: { value: roundToTwo(entry.solo.value + last.solo.value), modifier: {} },
                    total: { value: roundToTwo(entry.total.value + last.total.value), modifier: {} },

                    // Set as 0 for now, will revisit later on
                    class: {
                        airplane: {
                            single_engine_land: { value: roundToTwo(entry.class.airplane.single_engine_land.value + last.class.airplane.single_engine_land.value), modifier: {} },
                            multi_engine_land: { value: roundToTwo(entry.class.airplane.multi_engine_land.value + last.class.airplane.multi_engine_land.value), modifier: {} },
                            single_engine_sea: { value: roundToTwo(entry.class.airplane.single_engine_sea.value + last.class.airplane.single_engine_sea.value), modifier: {} },
                            multi_engine_sea: { value: roundToTwo(entry.class.airplane.multi_engine_sea.value + last.class.airplane.multi_engine_sea.value), modifier: {} },
                        },
                        rotorcraft: {
                            gyroplane: { value: roundToTwo(entry.class.rotorcraft.gyroplane.value + last.class.rotorcraft.gyroplane.value), modifier: {} },
                            helicopter: { value: roundToTwo(entry.class.rotorcraft.helicopter.value + last.class.rotorcraft.helicopter.value), modifier: {} },
                        },
                        glider: { value: roundToTwo(entry.class.glider.value + last.class.glider.value), modifier: {} },
                        lighter_than_air: {
                            airship: { value: roundToTwo(entry.class.lighter_than_air.airship.value + last.class.lighter_than_air.airship.value), modifier: {} },
                            balloon: { value: roundToTwo(entry.class.lighter_than_air.balloon.value + last.class.lighter_than_air.balloon.value), modifier: {} },
                        },
                        powered_lift: { value: roundToTwo(entry.class.powered_lift.value + last.class.powered_lift.value), modifier: {} },
                        powered_parachute: {
                            land: { value: roundToTwo(entry.class.powered_parachute.land.value + last.class.powered_parachute.land.value), modifier: {} },
                            sea: { value: roundToTwo(entry.class.powered_parachute.sea.value + last.class.powered_parachute.sea.value), modifier: {} },
                        },
                        weight_shift_control: {
                            land: { value: roundToTwo(entry.class.weight_shift_control.land.value + last.class.weight_shift_control.land.value), modifier: {} },
                            sea: { value: roundToTwo(entry.class.weight_shift_control.sea.value + last.class.weight_shift_control.sea.value), modifier: {} },
                        },
                        simulator: {
                            full: { value: roundToTwo(entry.class.simulator.full.value + last.class.simulator.full.value), modifier: {} },
                            flight_training_device: { value: roundToTwo(entry.class.simulator.flight_training_device.value + last.class.simulator.flight_training_device.value), modifier: {} },
                            aviation_training_device: { value: roundToTwo(entry.class.simulator.aviation_training_device.value + last.class.simulator.aviation_training_device.value), modifier: {} },
                        }
                    },

                    gear: {
                        fixed: {
                            tailwheel: { value: roundToTwo(entry.gear.fixed.tailwheel.value + last.gear.fixed.tailwheel.value), modifier: {} },
                            tricycle: { value: roundToTwo(entry.gear.fixed.tricycle.value + last.gear.fixed.tricycle.value), modifier: {} },
                            any: { value: roundToTwo(entry.gear.fixed.any.value + last.gear.fixed.any.value), modifier: {} },
                        },
                        retract: {
                            tailwheel: { value: roundToTwo(entry.gear.retract.tailwheel.value + last.gear.retract.tailwheel.value), modifier: {} },
                            tricycle: { value: roundToTwo(entry.gear.retract.tricycle.value + last.gear.retract.tricycle.value), modifier: {} },
                            any: { value: roundToTwo(entry.gear.retract.any.value + last.gear.retract.any.value), modifier: {} },
                        },
                        amphibian: { value: roundToTwo(entry.gear.amphibian.value + last.gear.amphibian.value), modifier: {} },
                        floats: { value: roundToTwo(entry.gear.floats.value + last.gear.floats.value), modifier: {} },
                        skids: { value: roundToTwo(entry.gear.skids.value + last.gear.skids.value), modifier: {} },
                        skis: { value: roundToTwo(entry.gear.skis.value + last.gear.skis.value), modifier: {} },
                    },

                    // Instrument flight
                    instrument: {
                        actual: { value: roundToTwo(entry.instrument.actual.value + last.instrument.actual.value), modifier: {} },
                        simulated: { value: roundToTwo(entry.instrument.simulated.value + last.instrument.simulated.value), modifier: {} },
                    },

                    // Dual flight
                    dual: {
                        given: { value: roundToTwo(entry.dual.given.value + last.dual.given.value), modifier: {} },
                        received: { value: roundToTwo(entry.dual.received.value + last.dual.received.value), modifier: {} },
                    },

                    // Duty Times
                    duty: {
                        on: { value: roundToTwo(entry.duty.on.value + last.duty.on.value), modifier: {} },
                        off: { value: roundToTwo(entry.duty.off.value + last.duty.off.value), modifier: {} },
                    },

                    // Number of Passengers
                    num_passengers: { value: roundToTwo(entry.num_passengers.value + last.num_passengers.value), modifier: {} },

                    // Hobbs start and end 
                    hobbs: {
                        start: { value: roundToTwo(entry.hobbs.start.value + last.hobbs.start.value), modifier: {} },
                        end: { value: roundToTwo(entry.hobbs.end.value + last.hobbs.end.value), modifier: {} },
                    },

                    // Tach start and end
                    tach: {
                        start: { value: roundToTwo(entry.tach.start.value + last.tach.start.value), modifier: {} },
                        end: { value: roundToTwo(entry.tach.end.value + last.tach.end.value), modifier: {} },
                    },

                    // Route
                    route: {
                        distance: { value: roundToTwo(entry.route.distance.value + last.route.distance.value), modifier: {} },
                    },

                    // Operations
                    operations: {
                        landings: {
                            all: { value: roundToTwo(entry.operations.landings.all.value + last.operations.landings.all.value), modifier: {} },
                            full_stop: {
                                day: { value: roundToTwo(entry.operations.landings.full_stop.day.value + last.operations.landings.full_stop.day.value), modifier: {} },
                                night: { value: roundToTwo(entry.operations.landings.full_stop.night.value + last.operations.landings.full_stop.night.value), modifier: {} },
                            }
                        },
                        takeoffs: {
                            day: { value: roundToTwo(entry.operations.takeoffs.day.value + last.operations.takeoffs.day.value), modifier: {} },
                            night: { value: roundToTwo(entry.operations.takeoffs.night.value + last.operations.takeoffs.night.value), modifier: {} },
                            all: { value: roundToTwo(entry.operations.takeoffs.all.value + last.operations.takeoffs.all.value), modifier: {} },
                        },
                        // Empty approaches list to be filled later
                        approaches: { value: roundToTwo(entry.operations.approaches.value + last.operations.approaches.value), modifier: {} },
                        holds: { value: roundToTwo(entry.operations.holds.value + last.operations.holds.value), modifier: {} },
                    },
                };
            }
        }

        // Get a specific value from the dataset. 
        // Row defines the row in the entries list
        // Address defines the param to get ('aircraft.id', 'pic', etc)
        get_value(row, address = undefined, object = undefined) {
            let data = this.get(row, address, object);

            // If data has a param 'value', then return that param
            if (data && 'value' in data) return data.value;
            else return null;
        }

        // Get a specific modifier from the dataset. 
        // Row defines the row in the entries list
        // Address defines the param to get ('aircraft.id', 'pic', etc)
        get_modifier(row, address = undefined, object = undefined) {
            let data = this.get(row, address, object);

            // If data has a param 'modifier', then return that param
            if (data && 'modifier' in data) return data.modifier;
            else return {};
        }

        // Get a specific entry from the dataset. 
        // Row defines the row in the entries list
        // Address defines the param to get ('aircraft.id', 'pic', etc)
        // @see https://stackoverflow.com/questions/4255472/javascript-object-access-variable-property-by-name-as-string
        get(row, address = undefined, object = undefined) {
            // if an object is not provided, then use this.entries
            if (!object) object = this.entries;

            // If the row selection is out of bounds, return null
            if (row < 0 || row >= object.length) return null;

            // If no address is provided, then return the entire row
            if (!address) return object[row];

            // If the address has no periods, then it is a direct key access
            if (address.indexOf('.') === -1) return object[row][address];

            // If it does, make a temp of the selected row
            let tmp = object[row];

            // For each part of the address, split by '.', dive into the object
            for (let v of address.split('.')) tmp = tmp[v];

            // Return the object
            return tmp;
        }

        // Set a specific value to the dataset
        // Row defines the row in the entries list
        // Address defines the param to get ('aircraft.id', 'pic', etc)
        // Value defines the value to write
        // @see https://stackoverflow.com/questions/18936915/dynamically-set-property-of-nested-object
        set_value(row, address, value) {
            // Define a moving reference to internal objects within obj
            let schema = this.entries[row];

            // console.log("set", row, schema, address, value);
            // Split the address by '.'
            let addressList = address.split('.');

            // Get a keyList by omitting the last element in the address
            let keyList = addressList.slice(0, addressList.length - 1);

            // Go through the keyList element by element
            for (let elem of keyList) {
                // If the schema does not have this key, then add it
                if (!(elem in schema)) schema[elem] = {}

                // Point the schema
                schema = schema[elem];
            }

            // Write the schema value at the last element in the addressList
            schema[addressList[addressList.length - 1]].value = value;
            schema[addressList[addressList.length - 1]].modifier.edited = true;

            // Now that we have edited the data, it is not longer consistent with the original
            // csv file that was imported. Run the event callback if defined
            if (this.event.data_changed) this.event.data_changed('set', { row, address, value });
        }

        // Use this.running_total to get the sum of all entries between the selected idx value and the 
        // very start of the logbook. Idx is fenced so that the output will never be invalid. An index 
        // value of 0 would correspond with the most modern logbook entry (and therefore, a very large total).
        // An index value of this.running_total.length would correspond with the oldest logbook entry
        // (and therefore a very small [or 0] total)
        get_total(address, idx) {
            // Assume the total is 0 for now (which would be the case if an idx value very far in the past
            // was selected)
            let total = 0;

            // If the selected value is actually less than the number of entries, then we need to calculate it
            if (idx < this.running_total.length) {

                // Fence the selected index so that it cannot be less than 0
                if (idx < 0) idx = 0;

                // Get the total
                total = this.get_value(idx, address, this.running_total);
            }

            // Return the total
            return total;
        }

        // Swap two entries by index. After the swap, the data is saved and the new totals are calculated
        swap(first, second) {
            // Seperate scope to reduce memory usage during the storage and calculation below
            {
                // Get the two entries to swap
                let entrySelected = this.entries[first]
                let entrySwap = this.entries[second];

                // Swap the entries
                this.entries[first] = entrySwap;
                this.entries[second] = entrySelected;
            }

            // If defined, run the data_changed callback
            if (this.event.data_changed) this.event.data_changed('swap', { first, second });

            // Update the total
            this.calculate_total();
        }

        // Get the sum of the given address. If an ending row is provided,
        // then sum to that row
        sum(address, end = 0, start = -1) {


            let end_total = this.get_total(address, end);

            // If no start address is provided, then we will get the complete running total
            if (start === -1) return end_total;
            else {
                // Get the total between the start index and the start of the logbook
                let start_total = this.get_total(address, start);

                // Subtract the end total and start total to get the total between start and end
                return roundToTwo(end_total - start_total);
            }
        }
    }

    return LogbookData;
});

// Function for rounding numbers to two dec places
// @see https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
function roundToTwo(num) {
    return +(Math.round(num + "e+2") + "e-2");
}
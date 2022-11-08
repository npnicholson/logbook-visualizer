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
                            id: { value: flight.AircraftID, modifier: { style : { } } }
                        },

                        // Date is in date object form
                        date: {
                            object: { value: new Date(date), modifier: { style : { } } },
                            short: { value: dateFns.format(date, "MM/DD/YY"), modifier: { style : { } } },
                            plain: { value: date, modifier: { style : { } } },
                        },

                        // Times
                        cross_country: {
                            point_to_point: { value: 0, modifier: { style : { } } },
                            atp: { value: 0, modifier: { style : { } } },
                            normal: { value: flight.CrossCountry, modifier: { style : { } } }
                        },
                        ground_training: { value: flight.GroundTraining, modifier: { style : { } } },
                        night: { value: flight.Night, modifier: { style : { } } },
                        pic: { value: flight.PIC, modifier: { style : { } } },
                        sic: { value: flight.SIC, modifier: { style : { } } },
                        solo: { value: flight.Solo, modifier: { style : { } } },
                        total: { value: flight.TotalTime, modifier: { style : { } } },

                        // Set as 0 for now, will revisit later on
                        class: {
                            airplane: {
                                single_engine_land: { value: 0, modifier: { style : { } } },
                                multi_engine_land: { value: 0, modifier: { style : { } } },
                                single_engine_sea: { value: 0, modifier: { style : { } } },
                                multi_engine_sea: { value: 0, modifier: { style : { } } }
                            },
                            rotorcraft: {
                                gyroplane: { value: 0, modifier: { style : { } } },
                                helicopter: { value: 0, modifier: { style : { } } }
                            },
                            glider: { value: 0, modifier: { style : { } } },
                            lighter_than_air: {
                                airship: { value: 0, modifier: { style : { } } },
                                balloon: { value: 0, modifier: { style : { } } }
                            },
                            powered_lift: { value: 0, modifier: { style : { } } },
                            powered_parachute: {
                                land: { value: 0, modifier: { style : { } } },
                                sea: { value: 0, modifier: { style : { } } },
                            },
                            weight_shift_control: {
                                land: { value: 0, modifier: { style : { } } },
                                sea: { value: 0, modifier: { style : { } } }
                            },
                            simulator: {
                                full: { value: 0, modifier: { style : { } } },
                                flight_training_device: { value: 0, modifier: { style : { } } },
                                aviation_training_device: { value: 0, modifier: { style : { } } }
                            }
                        },

                        // Set as 0 for now, will revisit later on
                        gear: {
                            fixed: {
                                tailwheel: { value: 0, modifier: { style : { } } },
                                tricycle: { value: 0, modifier: { style : { } } },
                                any: { value: 0, modifier: { style : { } } }
                            },
                            retract: {
                                tailwheel: { value: 0, modifier: { style : { } } },
                                tricycle: { value: 0, modifier: { style : { } } },
                                any: { value: 0, modifier: { style : { } } },
                            },
                            amphibian: { value: 0, modifier: { style : { } } },
                            floats: { value: 0, modifier: { style : { } } },
                            skids: { value: 0, modifier: { style : { } } },
                            skis: { value: 0, modifier: { style : { } } },
                        },

                        // Instrument flight
                        instrument: {
                            actual: { value: flight.ActualInstrument, modifier: { style : { } } },
                            simulated: { value: flight.SimulatedInstrument, modifier: { style : { } } },
                        },

                        // Dual flight
                        dual: {
                            given: { value: flight.DualGiven, modifier: { style : { } } },
                            received: { value: flight.DualReceived, modifier: { style : { } } },
                        },

                        // In/out/on/off times
                        time: {
                            in: { value: flight.TimeIn, modifier: { style : { } } },
                            out: { value: flight.TimeOut, modifier: { style : { } } },
                            on: { value: flight.TimeOn, modifier: { style : { } } },
                            off: { value: flight.TimeOff, modifier: { style : { } } },
                        },

                        // Duty Times
                        duty: {
                            on: { value: flight.OnDuty, modifier: { style : { } } },
                            off: { value: flight.OffDuty, modifier: { style : { } } },
                        },

                        // Empty passenger list
                        passengers: { value: [], modifier: { style : { } } },
                        num_passengers: { value: 0, modifier: { style : { } } },

                        comments: { value: flight.PilotComments, modifier: { style : { } } },

                        // Hobbs start and end 
                        hobbs: {
                            start: { value: flight.HobbsStart, modifier: { style : { } } },
                            end: { value: flight.HobbsEnd, modifier: { style : { } } },
                        },

                        // Tach start and end
                        tach: {
                            start: { value: flight.TachStart, modifier: { style : { } } },
                            end: { value: flight.TachEnd, modifier: { style : { } } },
                        },

                        // Route
                        route: {
                            from: { value: flight.From, modifier: { style : { } } },
                            via: { value: flight.Route, modifier: { style : { } } },
                            to: { value: flight.To, modifier: { style : { } } },
                            distance: { value: flight.Distance, modifier: { style : { } } },
                        },

                        // Instructor information
                        instructor: {
                            name: { value: flight.InstructorName, modifier: { style : { } } },
                            comments: { value: flight.InstructorComments, modifier: { style : { } } },
                        },

                        // Operations
                        operations: {
                            landings: {
                                all: { value: flight.AllLandings, modifier: { style : { } } },
                                full_stop: {
                                    day: { value: flight.DayLandingsFullStop, modifier: { style : { } } },
                                    night: { value: flight.NightLandingsFullStop, modifier: { style : { } } },
                                }
                            },
                            takeoffs: {
                                day: { value: flight.DayTakeoffs, modifier: { style : { } } },
                                night: { value: flight.NightTakeoffs, modifier: { style : { } } },
                                all: { value: flight.DayTakeoffs + flight.NightTakeoffs, modifier: { style : { } } },
                            },
                            // Empty approaches list to be filled later
                            approaches_list: { value: [], modifier: { style : { } } },
                            approaches: { value: 0, modifier: { style : { } } },
                            holds: { value: flight.Holds, modifier: { style : { } } },
                        },
                        classifications: {
                            is_checkride: { value: flight.Checkride, modifier: { style : { } } },
                            is_flight_review: { value: flight.FlightReview, modifier: { style : { } } },
                            is_instrument_proficiency_check: { value: flight.IPC, modifier: { style : { } } },
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

                    // Calculate point to point cross country time for this flight
                    // If this leg was counted as normal cross country, then by definition
                    // it also counts as point_to_point cross country. We use the total time value 
                    // because any landing within a flight makes the entire flight count as P2P XC.
                    if (ret.cross_country.normal.value > 0) {
                        ret.cross_country.point_to_point.value = ret.total.value;
                        ret.cross_country.point_to_point.modifier.tooltip = 'Normal XC time was provided for this flight';
                        ret.cross_country.point_to_point.modifier.style.derived = true;
                    }

                    // If the from and to values do not match and we did at least one landing OR we 
                    // gave dual instruction, then this is point_to_point
                    else if (ret.route.from.value !== ret.route.to.value &&
                        (ret.operations.landings.all.value > 0 || ret.dual.given.value > 0)) {
                        ret.cross_country.point_to_point.value = ret.total.value;
                        ret.cross_country.point_to_point.modifier.style.derived = true;

                        if (ret.operations.landings.all.value > 0)
                            ret.cross_country.point_to_point.modifier.tooltip = 'To and From differ and at least one landing occured';
                        else
                            ret.cross_country.point_to_point.modifier.tooltip = 'To and From differ and dual instruction was given (landings don\'t matter)';
                    }

                    // If the from and to values don't match but there is a valid route with an 
                    // additional landing OR we gave dual instruction, then this also counts as 
                    // point_to_point
                    else if (ret.route.via.value !== null &&
                        (ret.operations.landings.all.value > 1 || ret.dual.given.value > 0)) {
                        ret.cross_country.point_to_point.value = ret.total.value;
                        ret.cross_country.point_to_point.modifier.style.derived = true;

                        if (ret.operations.landings.all.value > 1)
                            ret.cross_country.point_to_point.modifier.tooltip = 'Flight occured via another airport and at least two landings occured';
                        else
                            ret.cross_country.point_to_point.modifier.tooltip = 'Flight occured via another airport and dual instruction was given (landings don\'t matter)';
                    }

                    // build a tooltip for why this flight didn't qualify as a p2p flight
                    else {
                        if (ret.route.from.value !== ret.route.to.value)
                            ret.cross_country.point_to_point.modifier.tooltip = 'To and From differ but the required landings were not observed';
                        else if (ret.route.via.value !== null)
                            ret.cross_country.point_to_point.modifier.tooltip = 'Flight occured via another airport but the required landings were not observed';
                    }

                    // Apply aircraft based information, if one is found
                    let craft = aircraft_table.data.find(aircraft => aircraft.AircraftID == flight.AircraftID);

                    // If the aircraft is defined in the list
                    if (flight.AircraftID && craft) {
                        // Assign the aircraft values
                        ret.aircraft.category = { value: craft.Category, modifier: { style : { } } };
                        ret.aircraft.class = { value: craft.Class, modifier: { style : { } } };
                        ret.aircraft.is_complex = { value: craft.Complex, modifier: { style : { } } };
                        ret.aircraft.is_high_performance = { value: craft.HighPerformance, modifier: { style : { } } };
                        ret.aircraft.is_pressurized = { value: craft.Pressurized, modifier: { style : { } } };
                        ret.aircraft.type = { value: craft.TypeCode, modifier: { style : { } } };
                        ret.aircraft.year = { value: craft.Year, modifier: { style : { } } };
                        ret.aircraft.make = { value: craft.Make, modifier: { style : { } } };
                        ret.aircraft.model = { value: craft.Model, modifier: { style : { } } };

                        // Convert the engine type to lower case
                        ret.aircraft.engine = { value: craft.EngineType !== null ? craft.EngineType.toLowerCase() : 'Undefined', modifier: { style : { } } };
                        ret.aircraft.gear = { value: craft.GearType, modifier: { style : { } } };

                        // Count the flight towards simulator time
                        if (craft.EquipmentType === 'ftd') {
                            ret.class.simulator.flight_training_device.value = flight.SimulatedFlight;
                        }
                        
                        // Count all other time based on the craft information
                        else if (craft.EquipmentType !== 'ffs') {

                            // Set the gear times
                            if (craft.GearType == 'fixed_tailwheel') ret.gear.fixed.tailwheel.value = ret.total.value;
                            else if (craft.GearType == 'fixed_tricycle') ret.gear.fixed.tricycle.value = ret.total.value;
                            else if (craft.GearType == 'retractable_tailwheel') ret.gear.retract.tailwheel.value = ret.total.value;
                            else if (craft.GearType == 'retractable_tricycle') ret.gear.retract.tricycle.value = ret.total.value;
                            else if (craft.GearType == 'amphibian') ret.gear.amphibian.value = ret.total.value;
                            else if (craft.GearType == 'floats') ret.gear.floats.value = ret.total.value;
                            else if (craft.GearType == 'skids') ret.gear.skids.value = ret.total.value;
                            else if (craft.GearType == 'skis') ret.gear.skis.value = ret.total.value;
                            else console.error("Unknown Gear Type: " + craft.GearType, craft);

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
                            // else if (craft.Class == 'flight_training_device') ret.class.simulator.flight_training_device.value = ret.total.value;
                            else if (craft.Class == 'aviation_training_device') ret.class.simulator.aviation_training_device.value = ret.total.value;
                            else console.error("Unknown Aircraft Class: " + craft.Class);
                        }

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
                    id: { value: entry.aircraft.id.value, modifier: { style : { } } },
                },

                // Times
                cross_country: {
                    atp: { value: entry.cross_country.atp.value, modifier: { style : { } } },
                    point_to_point: { value: entry.cross_country.point_to_point.value, modifier: { style : { } } },
                    normal: { value: entry.cross_country.normal.value, modifier: { style : { } } }
                },
                ground_training: { value: entry.ground_training.value, modifier: { style : { } } },
                night: { value: entry.night.value, modifier: { style : { } } },
                pic: { value: entry.pic.value, modifier: { style : { } } },
                sic: { value: entry.sic.value, modifier: { style : { } } },
                solo: { value: entry.solo.value, modifier: { style : { } } },
                total: { value: entry.total.value, modifier: { style : { } } },

                // Set as 0 for now, will revisit later on
                class: {
                    airplane: {
                        single_engine_land: { value: entry.class.airplane.single_engine_land.value, modifier: { style : { } } },
                        multi_engine_land: { value: entry.class.airplane.multi_engine_land.value, modifier: { style : { } } },
                        single_engine_sea: { value: entry.class.airplane.single_engine_sea.value, modifier: { style : { } } },
                        multi_engine_sea: { value: entry.class.airplane.multi_engine_sea.value, modifier: { style : { } } },
                    },
                    rotorcraft: {
                        gyroplane: { value: entry.class.rotorcraft.gyroplane.value, modifier: { style : { } } },
                        helicopter: { value: entry.class.rotorcraft.helicopter.value, modifier: { style : { } } },
                    },
                    glider: { value: entry.class.glider.value, modifier: { style : { } } },
                    lighter_than_air: {
                        airship: { value: entry.class.lighter_than_air.airship.value, modifier: { style : { } } },
                        balloon: { value: entry.class.lighter_than_air.balloon.value, modifier: { style : { } } },
                    },
                    powered_lift: { value: entry.class.powered_lift.value, modifier: { style : { } } },
                    powered_parachute: {
                        land: { value: entry.class.powered_parachute.land.value, modifier: { style : { } } },
                        sea: { value: entry.class.powered_parachute.sea.value, modifier: { style : { } } },
                    },
                    weight_shift_control: {
                        land: { value: entry.class.weight_shift_control.land.value, modifier: { style : { } } },
                        sea: { value: entry.class.weight_shift_control.sea.value, modifier: { style : { } } },
                    },
                    simulator: {
                        full: { value: entry.class.simulator.full.value, modifier: { style : { } } },
                        flight_training_device: { value: entry.class.simulator.flight_training_device.value, modifier: { style : { } } },
                        aviation_training_device: { value: entry.class.simulator.aviation_training_device.value, modifier: { style : { } } },
                    }
                },

                gear: {
                    fixed: {
                        tailwheel: { value: entry.gear.fixed.tailwheel.value, modifier: { style : { } } },
                        tricycle: { value: entry.gear.fixed.tricycle.value, modifier: { style : { } } },
                        any: { value: entry.gear.fixed.any.value, modifier: { style : { } } },
                    },
                    retract: {
                        tailwheel: { value: entry.gear.retract.tailwheel.value, modifier: { style : { } } },
                        tricycle: { value: entry.gear.retract.tricycle.value, modifier: { style : { } } },
                        any: { value: entry.gear.retract.any.value, modifier: { style : { } } },
                    },
                    amphibian: { value: entry.gear.amphibian.value, modifier: { style : { } } },
                    floats: { value: entry.gear.floats.value, modifier: { style : { } } },
                    skids: { value: entry.gear.skids.value, modifier: { style : { } } },
                    skis: { value: entry.gear.skis.value, modifier: { style : { } } },
                },

                // Instrument flight
                instrument: {
                    actual: { value: entry.instrument.actual.value, modifier: { style : { } } },
                    simulated: { value: entry.instrument.simulated.value, modifier: { style : { } } },
                },

                // Dual flight
                dual: {
                    given: { value: entry.dual.given.value, modifier: { style : { } } },
                    received: { value: entry.dual.received.value, modifier: { style : { } } },
                },

                // Duty Times
                duty: {
                    on: { value: entry.duty.on.value, modifier: { style : { } } },
                    off: { value: entry.duty.off.value, modifier: { style : { } } },
                },

                // Number of Passengers
                num_passengers: { value: entry.num_passengers.value, modifier: { style : { } } },

                // Hobbs start and end 
                hobbs: {
                    start: { value: entry.hobbs.start.value, modifier: { style : { } } },
                    end: { value: entry.hobbs.end.value, modifier: { style : { } } },
                },

                // Tach start and end
                tach: {
                    start: { value: entry.tach.start.value, modifier: { style : { } } },
                    end: { value: entry.tach.end.value, modifier: { style : { } } },
                },

                // Route
                route: {
                    distance: { value: entry.route.distance.value, modifier: { style : { } } },
                },

                // Operations
                operations: {
                    landings: {
                        all: { value: entry.operations.landings.all.value, modifier: { style : { } } },
                        full_stop: {
                            day: { value: entry.operations.landings.full_stop.day.value, modifier: { style : { } } },
                            night: { value: entry.operations.landings.full_stop.night.value, modifier: { style : { } } },
                        }
                    },
                    takeoffs: {
                        day: { value: entry.operations.takeoffs.day.value, modifier: { style : { } } },
                        night: { value: entry.operations.takeoffs.night.value, modifier: { style : { } } },
                        all: { value: entry.operations.takeoffs.all.value, modifier: { style : { } } },
                    },
                    // Empty approaches list to be filled later
                    approaches: { value: entry.operations.approaches.value, modifier: { style : { } } },
                    holds: { value: entry.operations.holds.value, modifier: { style : { } } },
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
                    cross_country: {
                        atp: { value: roundToTwo(entry.cross_country.atp.value + last.cross_country.atp.value), modifier: { style : { } } },
                        point_to_point: { value: roundToTwo(entry.cross_country.point_to_point.value + last.cross_country.point_to_point.value), modifier: { style : { } } },
                        normal: { value: roundToTwo(entry.cross_country.normal.value + last.cross_country.normal.value), modifier: { style : { } } },
                    },
                    ground_training: { value: roundToTwo(entry.ground_training.value + last.ground_training.value), modifier: { style : { } } },
                    night: { value: roundToTwo(entry.night.value + last.night.value), modifier: { style : { } } },
                    pic: { value: roundToTwo(entry.pic.value + last.pic.value), modifier: { style : { } } },
                    sic: { value: roundToTwo(entry.sic.value + last.sic.value), modifier: { style : { } } },
                    solo: { value: roundToTwo(entry.solo.value + last.solo.value), modifier: { style : { } } },
                    total: { value: roundToTwo(entry.total.value + last.total.value), modifier: { style : { } } },

                    // Set as 0 for now, will revisit later on
                    class: {
                        airplane: {
                            single_engine_land: { value: roundToTwo(entry.class.airplane.single_engine_land.value + last.class.airplane.single_engine_land.value), modifier: { style : { } } },
                            multi_engine_land: { value: roundToTwo(entry.class.airplane.multi_engine_land.value + last.class.airplane.multi_engine_land.value), modifier: { style : { } } },
                            single_engine_sea: { value: roundToTwo(entry.class.airplane.single_engine_sea.value + last.class.airplane.single_engine_sea.value), modifier: { style : { } } },
                            multi_engine_sea: { value: roundToTwo(entry.class.airplane.multi_engine_sea.value + last.class.airplane.multi_engine_sea.value), modifier: { style : { } } },
                        },
                        rotorcraft: {
                            gyroplane: { value: roundToTwo(entry.class.rotorcraft.gyroplane.value + last.class.rotorcraft.gyroplane.value), modifier: { style : { } } },
                            helicopter: { value: roundToTwo(entry.class.rotorcraft.helicopter.value + last.class.rotorcraft.helicopter.value), modifier: { style : { } } },
                        },
                        glider: { value: roundToTwo(entry.class.glider.value + last.class.glider.value), modifier: { style : { } } },
                        lighter_than_air: {
                            airship: { value: roundToTwo(entry.class.lighter_than_air.airship.value + last.class.lighter_than_air.airship.value), modifier: { style : { } } },
                            balloon: { value: roundToTwo(entry.class.lighter_than_air.balloon.value + last.class.lighter_than_air.balloon.value), modifier: { style : { } } },
                        },
                        powered_lift: { value: roundToTwo(entry.class.powered_lift.value + last.class.powered_lift.value), modifier: { style : { } } },
                        powered_parachute: {
                            land: { value: roundToTwo(entry.class.powered_parachute.land.value + last.class.powered_parachute.land.value), modifier: { style : { } } },
                            sea: { value: roundToTwo(entry.class.powered_parachute.sea.value + last.class.powered_parachute.sea.value), modifier: { style : { } } },
                        },
                        weight_shift_control: {
                            land: { value: roundToTwo(entry.class.weight_shift_control.land.value + last.class.weight_shift_control.land.value), modifier: { style : { } } },
                            sea: { value: roundToTwo(entry.class.weight_shift_control.sea.value + last.class.weight_shift_control.sea.value), modifier: { style : { } } },
                        },
                        simulator: {
                            full: { value: roundToTwo(entry.class.simulator.full.value + last.class.simulator.full.value), modifier: { style : { } } },
                            flight_training_device: { value: roundToTwo(entry.class.simulator.flight_training_device.value + last.class.simulator.flight_training_device.value), modifier: { style : { } } },
                            aviation_training_device: { value: roundToTwo(entry.class.simulator.aviation_training_device.value + last.class.simulator.aviation_training_device.value), modifier: { style : { } } },
                        }
                    },

                    gear: {
                        fixed: {
                            tailwheel: { value: roundToTwo(entry.gear.fixed.tailwheel.value + last.gear.fixed.tailwheel.value), modifier: { style : { } } },
                            tricycle: { value: roundToTwo(entry.gear.fixed.tricycle.value + last.gear.fixed.tricycle.value), modifier: { style : { } } },
                            any: { value: roundToTwo(entry.gear.fixed.any.value + last.gear.fixed.any.value), modifier: { style : { } } },
                        },
                        retract: {
                            tailwheel: { value: roundToTwo(entry.gear.retract.tailwheel.value + last.gear.retract.tailwheel.value), modifier: { style : { } } },
                            tricycle: { value: roundToTwo(entry.gear.retract.tricycle.value + last.gear.retract.tricycle.value), modifier: { style : { } } },
                            any: { value: roundToTwo(entry.gear.retract.any.value + last.gear.retract.any.value), modifier: { style : { } } },
                        },
                        amphibian: { value: roundToTwo(entry.gear.amphibian.value + last.gear.amphibian.value), modifier: { style : { } } },
                        floats: { value: roundToTwo(entry.gear.floats.value + last.gear.floats.value), modifier: { style : { } } },
                        skids: { value: roundToTwo(entry.gear.skids.value + last.gear.skids.value), modifier: { style : { } } },
                        skis: { value: roundToTwo(entry.gear.skis.value + last.gear.skis.value), modifier: { style : { } } },
                    },

                    // Instrument flight
                    instrument: {
                        actual: { value: roundToTwo(entry.instrument.actual.value + last.instrument.actual.value), modifier: { style : { } } },
                        simulated: { value: roundToTwo(entry.instrument.simulated.value + last.instrument.simulated.value), modifier: { style : { } } },
                    },

                    // Dual flight
                    dual: {
                        given: { value: roundToTwo(entry.dual.given.value + last.dual.given.value), modifier: { style : { } } },
                        received: { value: roundToTwo(entry.dual.received.value + last.dual.received.value), modifier: { style : { } } },
                    },

                    // Duty Times
                    duty: {
                        on: { value: roundToTwo(entry.duty.on.value + last.duty.on.value), modifier: { style : { } } },
                        off: { value: roundToTwo(entry.duty.off.value + last.duty.off.value), modifier: { style : { } } },
                    },

                    // Number of Passengers
                    num_passengers: { value: roundToTwo(entry.num_passengers.value + last.num_passengers.value), modifier: { style : { } } },

                    // Hobbs start and end 
                    hobbs: {
                        start: { value: roundToTwo(entry.hobbs.start.value + last.hobbs.start.value), modifier: { style : { } } },
                        end: { value: roundToTwo(entry.hobbs.end.value + last.hobbs.end.value), modifier: { style : { } } },
                    },

                    // Tach start and end
                    tach: {
                        start: { value: roundToTwo(entry.tach.start.value + last.tach.start.value), modifier: { style : { } } },
                        end: { value: roundToTwo(entry.tach.end.value + last.tach.end.value), modifier: { style : { } } },
                    },

                    // Route
                    route: {
                        distance: { value: roundToTwo(entry.route.distance.value + last.route.distance.value), modifier: { style : { } } },
                    },

                    // Operations
                    operations: {
                        landings: {
                            all: { value: roundToTwo(entry.operations.landings.all.value + last.operations.landings.all.value), modifier: { style : { } } },
                            full_stop: {
                                day: { value: roundToTwo(entry.operations.landings.full_stop.day.value + last.operations.landings.full_stop.day.value), modifier: { style : { } } },
                                night: { value: roundToTwo(entry.operations.landings.full_stop.night.value + last.operations.landings.full_stop.night.value), modifier: { style : { } } },
                            }
                        },
                        takeoffs: {
                            day: { value: roundToTwo(entry.operations.takeoffs.day.value + last.operations.takeoffs.day.value), modifier: { style : { } } },
                            night: { value: roundToTwo(entry.operations.takeoffs.night.value + last.operations.takeoffs.night.value), modifier: { style : { } } },
                            all: { value: roundToTwo(entry.operations.takeoffs.all.value + last.operations.takeoffs.all.value), modifier: { style : { } } },
                        },
                        // Empty approaches list to be filled later
                        approaches: { value: roundToTwo(entry.operations.approaches.value + last.operations.approaches.value), modifier: { style : { } } },
                        holds: { value: roundToTwo(entry.operations.holds.value + last.operations.holds.value), modifier: { style : { } } },
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

            // Assume for a second that the previous value was the original value
            let original = schema[addressList[addressList.length - 1]].value;

            // See if this entry has 'original' included in its modifier object. If it does, then
            // that is the actual origional value
            if ('original' in schema[addressList[addressList.length - 1]].modifier) 
                original = schema[addressList[addressList.length - 1]].modifier.original;

            // If there is no original entry yet, then add it now. The last value must be the orig.
            else schema[addressList[addressList.length - 1]].modifier.original = original;

            // Write the schema value at the last element in the addressList
            schema[addressList[addressList.length - 1]].value = value;

            // If the value has changed from the original, then mark it as edited. Otherwise remove
            // any such markings 
            if (value !== original) {
                schema[addressList[addressList.length - 1]].modifier.style.edited = true;
                schema[addressList[addressList.length - 1]].modifier.tooltip = `Was ${original}`;
            } else {
                delete schema[addressList[addressList.length - 1]].modifier.style.edited;
                delete schema[addressList[addressList.length - 1]].modifier.tooltip;
            }

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
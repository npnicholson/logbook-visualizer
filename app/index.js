// 'use strict';

define((require) => {

    console.log('V0.0.1');

    // Load any app-specific modules
    // with a relative require call,
    // like:
    var LogbookData = require('./util/model/logbook-data');
    var LogbookStyler = require('./util/view/logbook-styler');
    var TableManager = require('./util/controller/table-manager');

    // Init vars
    let model, styler, manager, hot;
    let data_edited;

    // Method that is called every time the data_clean flag is changed. This flag records
    // whether or not the current data matches the original csv data
    const on_data_changed = (event, ops) => {
        // Do not update the localStorage if the data was just loaded
        if (event != 'load') {

            // Store the new data
            localStorage.setItem('logbook_manager_entries', JSON.stringify(model.entries));

            // If this was a set or swap event, then the data has been changed
            if (event == 'set' || event == 'swap') data_edited = true;

            // If this is a parse event, then this is new data that has not been changed yet
            else if (event == 'parse') data_edited = false;

            // Store whether or not the data has changed
            localStorage.setItem('logbook_manager_entries_edited', data_edited);
        }

        $('#data_edited').text(data_edited ? 'Modified' : 'Same');
    }

    const get_data = () => {
        // Store whether or not the data is clean. 
        data_edited = localStorage.getItem('logbook_manager_entries_edited');
        if (data_edited === null) data_edited = false;
        else data_edited = data_edited == 'true' ? true : false;


        // Get the stored text from localstorage
        let stored_entries = localStorage.getItem('logbook_manager_entries');

        // If the stored value is undefined, return []
        if (stored_entries === null) return false;

        // Parse the stored entries
        let parsed_entries = JSON.parse(stored_entries);

        // If the parsed data is not an array, return []
        if (!Array.isArray(parsed_entries)) return false;

        // Return the entries
        return parsed_entries;
    }

    let main = async () => {
        // Build the model from the imported csv data
        model = new LogbookData({ on_data_changed });
        // Seperate scope to prevent memory usage after the storage is finished
        {
            let stored_data = get_data();
            if (stored_data) model.load(stored_data);

            // Get some testing data to use
            // let fetch_result = await fetch('data/logbook_latest.csv');
            // let csvData = await fetch_result.text();
            // model.parseForeflight(csvData);
        }

        $('#upload').on('change', function () {
            console.log("Click!")
            var file = $('#upload').prop('files')[0];

            // file.accessed = Date.now();
            localStorage.setItem('logbook_manager_file_data', JSON.stringify({
                accessed: Date.now(),
                lastModified: file.lastModified,
                name: file.name,
                size: file.size,
                type: file.type
            }));

            // setting up the reader
            var reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            // here we tell the reader what to do when it's done reading...
            reader.onload = readerEvent => {
                model.parseForeflight(readerEvent.target.result);
                manager.render();
            }
        });


        // console.log(model.entries)

        const counter_formatter = (val) => {
            if (val === null || val === 0) return '';
            else return val;
        }

        const time_formatter = (val) => {
            if (isNaN(val)) return val;
            else if (val === null) return '';
            else if (val !== 0) return val.toFixed(1);
            else return '';
        }

        // Build a string from the approach list
        const array_tooltip = (row_data) => {
            if (row_data == null) return null;
            let output = "";
            for (let app of row_data.operations.approaches_list.value) {
                output += app.approach + " " + app.runway + " @ " + app.airport + "<br>";
            }
            return output;
        }

        // Reach in and grab the internal tooltip param of the given value
        const ptp_cross_country_tooltip = (row_data) => {
            if (row_data == null) return null;
            console.log('r', row_data);
            console.log(row_data.cross_country.point_to_point.tooltip);
            return row_data.cross_country.point_to_point.tooltip;
        }

        const columns = [
            { cols: [{ width: 65, sum: false, source: 'date.short', title: 'Date', highlight: false }] },
            { cols: [{ width: 55, sum: false, source: 'aircraft.type', title: 'Aircraft Type', highlight: false }] },
            { cols: [{ width: 65, sum: false, source: 'aircraft.id', title: 'Aircraft Ident', highlight: false }] },
            {
                title: 'Route of Flight', cols: [
                    { width: 45, sum: false, source: 'route.from', title: 'From', highlight: false },
                    { width: 45, sum: false, source: 'route.via', tooltip: 'route.via', title: 'Via', highlight: false },
                    { width: 45, sum: false, source: 'route.to', title: 'To', highlight: false }
                ]
            },
            { cols: [{ width: 25, sum: false, source: 'operations.approaches', tooltip: array_tooltip, title: '# AP', formatter: counter_formatter, highlight: true }] },
            { cols: [{ width: 25, sum: false, source: 'operations.holds', title: '# H', formatter: counter_formatter, highlight: true }] },
            { cols: [{ width: 240, sum: false, source: 'comments', tooltip: 'comments', title: 'Remarks and Endorsements', highlight: false, text: true }] },
            { cols: [{ width: 35, sum: true, source: 'operations.takeoffs.all', title: '# TO', formatter: counter_formatter, highlight: true }] },
            { cols: [{ width: 35, sum: true, source: 'operations.landings.all', title: '# LD', formatter: counter_formatter, highlight: true }] },
            {
                title: 'Aircraft Cat', cols: [
                    { width: 45, sum: true, source: 'class.airplane.single_engine_land', title: 'SEL', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'class.airplane.multi_engine_land', title: 'MEL', formatter: time_formatter, highlight: true }
                ]
            },
            {
                title: 'And Class', cols: [
                    // { width: 45, sum: false, source: null, title: '', highlight: false },
                    { width: 45, sum: true, source: 'gear.retract.any', title: 'Retract', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'dual.given', title: 'Dual Given', formatter: time_formatter, highlight: false }
                ]
            },
            {
                title: 'Conditions of Flight', cols: [
                    { width: 45, sum: true, source: 'night', title: 'Night', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'instrument.actual', title: 'Inst', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'instrument.simulated', title: 'Sim Inst', formatter: time_formatter, highlight: true }
                ]
            },
            { cols: [{ width: 45, sum: true, source: 'class.simulator.flight_training_device', title: 'Flight Sim', formatter: time_formatter, highlight: false }] },
            {
                title: 'Conditions of Flight', cols: [
                    { width: 45, sum: true, source: 'cross_country.normal', title: 'XC', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'cross_country.point_to_point', tooltip: true, title: 'XC P2P', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'solo', title: 'Solo', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'dual.received', title: 'Dual Rec', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'pic', title: 'PIC', formatter: time_formatter, highlight: false }
                ]
            },
            { cols: [{ width: 45, sum: true, source: 'total', title: 'Total Time', formatter: time_formatter, highlight: true }] }
        ]

        const secondary_col = [
            { cols: [{ width: 60, sum: false, source: 'date.short', title: 'Date', highlight: false }] },
            { cols: [{ width: 55, sum: false, source: 'aircraft.type', title: 'Aircraft Type', highlight: false }] },
            { cols: [{ width: 65, sum: false, source: 'aircraft.id', title: 'Aircraft Ident', highlight: false }] },
            {
                title: 'Route of Flight', cols: [
                    { width: 45, sum: false, source: 'route.from', title: 'From', highlight: false },
                    { width: 45, sum: false, source: 'route.via', tooltip: 'route.via', title: 'Via', highlight: false },
                    { width: 45, sum: false, source: 'route.to', title: 'To', highlight: false }
                ]
            },
            { cols: [{ width: 45, sum: true, source: 'total', title: 'Total', formatter: time_formatter, highlight: true }] },
            {
                title: 'Aircraft Category & Class', cols: [
                    { width: 45, sum: true, source: 'class.airplane.single_engine_land', title: 'SEL', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'class.airplane.multi_engine_land', title: 'MEL', formatter: time_formatter, highlight: true },
                    { width: 45, sum: false, source: null, title: '', highlight: false },
                    { width: 45, sum: false, source: null, title: '', highlight: true },
                ]
            },

            {
                title: 'Instrument', cols: [
                    { width: 45, sum: true, source: 'instrument.actual', title: 'Inst', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'instrument.simulated', title: 'Sim Inst', formatter: time_formatter, highlight: true },
                    { width: 25, sum: false, source: 'operations.approaches', tooltip: array_tooltip, title: '# A', formatter: counter_formatter, highlight: false },
                    { width: 25, sum: false, source: 'operations.holds', title: '# H', formatter: counter_formatter, highlight: true },
                    { width: 45, sum: false, source: null, title: 'Nav / Track', highlight: false },
                    // { width: 45, sum: true, source: 'gear.retract.any', title: 'Retract', formatter: time_formatter, highlight: false },
                ]
            },

            { cols: [{ width: 45, sum: true, source: 'class.simulator.flight_training_device', title: 'Sim or ATD', formatter: time_formatter, highlight: true }] },

            {
                title: 'Landings', cols: [
                    { width: 35, sum: true, source: 'operations.landings.all', title: 'All', formatter: counter_formatter, highlight: false },
                    { width: 35, sum: true, source: 'operations.landings.full_stop.day', title: 'Day', formatter: counter_formatter, highlight: false },
                    { width: 35, sum: true, source: 'operations.landings.full_stop.night', title: 'Night', formatter: counter_formatter, highlight: true }
                ]
            },

            {
                title: 'Type of Pilot Experience or Training', cols: [
                    { width: 45, sum: false, source: 'ground_training', title: 'Ground Rec', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'dual.received', title: 'Dual Rec', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'cross_country.normal', title: 'XC', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'cross_country.point_to_point', tooltip: true, title: 'XC P2P', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'night', title: 'Night', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'solo', title: 'Solo', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'pic', title: 'PIC', formatter: time_formatter, highlight: true },
                    { width: 45, sum: true, source: 'sic', title: 'SIC', formatter: time_formatter, highlight: false },
                    { width: 45, sum: true, source: 'dual.given', title: 'Dual Given', formatter: time_formatter, highlight: true },
                    { width: 45, sum: false, source: null, title: 'Ground Given', formatter: time_formatter, highlight: false }
                ]
            },

            { cols: [{ width: 240, sum: false, source: 'comments', tooltip: true, title: 'Remarks and Endorsements', highlight: false, text: true }] },     
        ]

        // Set up te styler
        // styler = new LogbookStyler({ columns: columns, row_border_offset: 1, row_border_spacing: 3, num_rows: 13 });
        styler = new LogbookStyler({ columns: secondary_col, row_border_offset: 3, row_border_spacing: 4, num_rows: 16 });

        // Build the style
        styler.build();

        // Define custom changes to be made to the styler
        let [page_total_row, _] = styler.get_page_total_position();
        styler.add_merge({ row: page_total_row, col: 0, colspan: styler.summation_start, rowspan: 3 });
        styler.set_data(page_total_row, 0, 'I am certify that the entries in this log are true,\n_________________________________\nPILOT SIGNATURE');

        // Set up the manager
        let container = document.getElementById('logbook');
        manager = new TableManager(container, { styler, model });
        hot = manager.init();

        console.log(manager);
        console.log(styler);
        console.log(model);

        // Add a handler for after a user selection so that we can select rows
        hot.addHook('afterSelection', (r, c) => {
            // If the user's selection is within the view, then select the row
            if (styler.row_within_view(r)) manager.select(r, c);

            // Otherwise, clear any selections
            else manager.clear_selection(true);
        });

        // Handler for key events
        const handleKey = (event) => {
            // Only handle key inputs if the user is not currently editing 
            // a cell in the table
            if (manager.last_selected.row === null) {

                // Set up some vars
                let do_update = false;
                let key_code = event.code

                // Go one entry back
                if (key_code == "ArrowUp") {
                    do_update = true;
                    if (!event.shiftKey) manager.up();
                    else manager.swap_up();
                }

                // Go one entry ahead
                else if (key_code == "ArrowDown") {
                    do_update = true;
                    if (!event.shiftKey) manager.down();
                    else manager.swap_down();
                }

                else if (!event.shiftKey && key_code == "Tab") {
                    do_update = true;
                    manager.next();
                }

                else if (event.shiftKey && key_code == "Tab") {
                    do_update = true;
                    manager.prev();
                }

                // Go back one page
                else if (key_code == "ArrowLeft") {
                    do_update = true;
                    manager.prev();
                }

                // Go forward one page
                else if (key_code == "ArrowRight") {
                    do_update = true;
                    manager.next();
                }

                // Go to the start
                else if (key_code == "BracketLeft") {
                    do_update = true;
                    manager.start();
                }

                // Go to the end
                else if (key_code == "BracketRight") {
                    do_update = true;
                    manager.end();
                }

                // Select next
                else if (key_code == "Comma") {
                    do_update = true;
                    manager.select_up();
                }

                // Select Prev
                else if (key_code == "Period") {
                    do_update = true;
                    manager.select_down();
                }

                else if (key_code == "Backslash") {
                    // do_update = true;

                    console.log("Destroy");

                    $('#upload').click();
                }

                else if (key_code == "Escape") {
                    do_update = true;
                    manager.clear_selection();
                }

                else if (key_code == "Enter") {
                    do_update = true;
                    manager.select_down();
                }

                else if (key_code == "KeyN") {
                    console.log("Letter N");
                }

                else {
                    console.log("Selected ", key_code);
                }

                if (do_update) {
                    // Stop the normal actions for this key input
                    event.stopImmediatePropagation()
                    event.preventDefault();

                    // Render the manager
                    manager.render();
                }
            }
        }

        // Handle key input when the user is selected on the table
        hot.addHook('beforeKeyDown', handleKey);

        // Handle key input when the user is selected outside the table
        hotkeys('right,left,up,down,[,],n,u,escape,enter,tab,\\', handleKey);
    }

    main();



    /*


    // console.log(l);

    // const LogbookData = require('./util/logbook-data.js')

    // const Cookies = require("js.cookie");

    // var angular = require('angular');
    // var moment = require('moment');

    // Get the cursor from cookie if it exists
    var cursor = localStorage.getItem('logbook_manager_cursor');

    // If the cursor cookie does not exist, then start at 0
    if (!cursor) cursor = 0
    // Otherwise, parse the cursor as an int
    else cursor = parseInt(cursor)

    const num_rows = 13
    const totals_page_row = num_rows + 0
    const totals_forwarded_row = num_rows + 1
    const totals_all_row = num_rows + 2

    const header_config = [
        { label: 'Date', width: 55, tag: 'date' },
        { label: 'Aircraft Type', width: 55, tag: 'type' },
        { label: 'Aircraft Ident', width: 65, tag: 'ident' },
        { label: 'Route of Flight', width: 45 * 2, sub_headers: ['From', 'To'], sub_tags: ['from', 'to'] },
        { label: '# Ap', width: 25, tag: 'inst_apps' },
        { label: 'Remarks and Endorsements', width: 240, tag: 'remarks' },
        { label: '# TO', width: 35, tag: 'takeoffs' },
        { label: '# LD', width: 35, tag: 'landings' },
        { label: 'Aircraft Cat', width: 45 * 2, sub_headers: ['SEL', 'MEL'], sub_tags: ['sel', 'mel'] },
        { label: 'And Class', width: 45 * 2, sub_headers: ['', 'Dual Given'], sub_tags: [null, 'dual_given'] },
        { label: 'Conditions of Flight', width: 45 * 3, sub_headers: ['Night', 'Inst', 'Sim Inst'], sub_tags: ['night', 'inst', 'sim_inst'] },
        { label: 'Flight Sim', width: 45, tag: 'simulator' },
        { label: 'Types of Piloting Time', width: 45 * 4, sub_headers: ['XC', 'Solo', 'Dual Rec', 'PIC'], sub_tags: ['xc', 'solo', 'dual_received', 'pic'] },
        { label: 'Total Time', width: 45, tag: 'total' },
    ]

    function build_header(config) {
        // Init the top and bottom header rows, as well as the merge_cells to return
        let h0 = [], h1 = [];
        let merge_cells = [];
        let col_widths = [];
        let col_tags = {}

        // Start at col number 0
        let col_num = 0;

        // Go through each field of the config
        for (let field of config) {

            // If the field has a sub_headers list defined, handle it differently
            if (field.sub_headers) {

                // The number of cols taken up by this field is the length of its
                // sub_headers list
                let num_cols = field.sub_headers.length

                // Iterate through each sub_header in the sub_headers list and 
                // add the field.label to the top row and the sub_header to the bottom
                // row
                for (let sub_header_idx = 0; sub_header_idx < field.sub_headers.length; sub_header_idx++) {
                    // Get this sub_header
                    let sub_header = field.sub_headers[sub_header_idx]

                    // Add this column to the tags list
                    col_tags[field.sub_tags[sub_header_idx]] = col_num + sub_header_idx

                    // Add the width to the col_widths list
                    col_widths.push(field.width / num_cols)

                    // Add the top and bottom row names
                    h0.push(field.label);
                    h1.push(sub_header)
                }

                // Set up the merge_cells entry for the top row. It should span num_cols
                // columns in total
                merge_cells.push({ row: 0, col: col_num, rowspan: 1, colspan: num_cols })

                // Move our "cursor" based on the number of columns taken up by this field
                col_num += num_cols
            }

            // If the field has no sub_headers list defined, then simply enter the 
            // field normally
            else {

                // Add this column to the tags list
                col_tags[field.tag] = col_num

                // Add the width to the col_widths list
                col_widths.push(field.width)

                // Add the field label to the top row
                h0.push(field.label);

                // Add nothing to the bottom row
                h1.push('');

                // Set up the merge_Cells entry for the top row to span down onto the 
                // bottom row
                merge_cells.push({ row: 0, col: col_num, rowspan: 2, colspan: 1 })

                // Move our "Cursor" over by one space
                col_num++;
            }
        }

        return { header_fields: [h0, h1], merge_cells, col_widths, col_tags, num_cols: col_num }
    }

    // Build the header
    const { header_fields, merge_cells, col_widths, col_tags, num_cols } = build_header(header_config)

    // Converts a 0 index row to a row that will work with the table (header and all)
    const row_translator = (row) => row + header_fields.length

    // Create the blank data from the header definition
    let blank_data = [
        ...header_fields
    ]
    for (let row = 0; row < num_rows; row++) {
        let row = []
        for (let idx in num_cols) {
            row.push('')
        }
        blank_data.push(row)
    }

    // Add the summation rows
    for (let row = 0; row < 3; row++) {
        let row = []
        for (let idx in num_cols) {
            row.push('')
        }
        blank_data.push(row)
    }
    blank_data[row_translator(num_rows)][0] = "I certify that the entries in this log are true,\n_________________________________\nPILOT SIGNATURE"
    merge_cells.push({ row: row_translator(num_rows), col: 0, rowspan: 3, colspan: 6 })
    blank_data[row_translator(totals_page_row)][6] = "Totals This Page"
    blank_data[row_translator(totals_forwarded_row)][6] = "Amount Forwarded"
    blank_data[row_translator(totals_all_row)][6] = "Totals to Date"

    const borders = [
        { row: row_translator(0), top: '#5292F7' },
        { row: row_translator(1), bottom: '#AAAAAA' },
        { row: row_translator(4), bottom: '#AAAAAA' },
        { row: row_translator(7), bottom: '#AAAAAA' },
        { row: row_translator(10), bottom: '#AAAAAA' },
        { row: row_translator(num_rows), top: '#5292F7' },
    ]

    let border_settings = []
    for (let field of borders) {
        let entry = {}

        // Rows and not cols
        if (field.row && field.col == undefined) entry.range = {
            from: { row: field.row, col: 0 },
            to: { row: field.row, col: num_cols }
        }

        // Cols and not rows
        if (field.col && field.row == undefined) entry.range = {
            from: { row: 0, col: field.col },
            to: { row: row_translator(num_rows) + 3, col: field.col }
        }

        // Cols and  rows
        if (field.col && field.row) entry.range = {
            from: { row: field.row, col: field.col },
            to: { row: field.row, col: field.col },
        }

        // Top Border
        if (field.top) entry.top = {
            width: 2,
            color: field.top // '#5292F7'
        }

        // Bottom Border
        if (field.bottom) entry.bottom = {
            width: 2,
            color: field.bottom
        }

        // Left Border
        if (field.left) entry.left = {
            width: 2,
            color: field.left
        }

        // Right Border
        if (field.right) entry.right = {
            width: 2,
            color: field.right
        }

        // Apply the border settings
        border_settings.push(entry)
    }

    // Set up the main container
    const container = document.getElementById('example');
    const settings = {
        data: blank_data,
        rowHeaders: false,
        colHeaders: false,
        colWidths: col_widths,
        mergeCells: merge_cells,
        readOnly: true,
        selectionMode: 'single',
        disableVisualSelection: true,
        customBorders: border_settings,
        licenseKey: 'non-commercial-and-evaluation'
    }
    const hot = new Handsontable(container, settings);

    var highlightedRow = null;
    var lastRowClass = [];
    const clearSelectionHighlight = () => {
        if (highlightedRow != null) {
            for (var i = 0; i < hot.countCols(); i++) {
                let className = lastRowClass[i];
                hot.setCellMeta(highlightedRow, i, 'className', className);
            }
            highlightedRow = null;
            highlightedRow = null;
        }
    }

    let lastSelectedCell = {
        r: null,
        c: null
    };

    // Remarks, TO, LDG, Dual Given, Night, Inst, Sim Inst, FTD, XC, Solo, Dual Rec, PIC, Total
    const editableCols = [6, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    Handsontable.hooks.add('afterSelection', function (r, c) {

        clearSelectionHighlight();

        // Limit the selection highlighting to the viewable area
        if (r >= 2 && r <= 14) {
            // Go through eacl cell in this row and apply the 'select' class
            for (var i = 0; i < hot.countCols(); i++) {
                lastRowClass[i] = hot.getCellMeta(r, i).className;

                let className = lastRowClass[i];
                hot.setCellMeta(r, i, 'className', className + 'select');
            }
            // Record this as the highlighted row
            highlightedRow = r;

            // If there was a last selection
            if (lastSelectedCell.r && lastSelectedCell.c) {
                // If this selection is the same as last selection, then make it editable
                if (r == lastSelectedCell.r && c == lastSelectedCell.c && editableCols.includes(c)) hot.setCellMeta(r, c, 'readOnly', false);

                // Otherwise, make the last selected cell readonly
                else hot.setCellMeta(lastSelectedCell.r, lastSelectedCell.c, 'readOnly', true);
            }
            // Record this cell as the last selected cell
            lastSelectedCell.r = r; lastSelectedCell.c = c;

        }
        // If the user selects outside the viewable area, then clear the selection
        else {
            highlightedRow = null;
            lastRowClass = [];
        }

        // Render the table with these new changes
        hot.render();
    });

    Handsontable.hooks.add('afterChange', function (change, source) {
        // Only listen for edit undo, edit redo, and basic edits
        if (source == 'UndoRedo.undo' || source == 'UndoRedo.redo' || source == 'edit') {

            // Only look at edits with a single change. This limits our search to only those edits
            // which the user made. Automated edits can edit hundreds of cells at once
            if (change.length == 1) {
                console.log(change, source);
                let edit = change[0];

                let r = edit[0],
                    c = edit[1];

                let last = edit[2];
                let update = edit[3];

                let entryIdx = cursor + num_rows - r + 1;
                let entry = flights_table.data[entryIdx];

                let metrics = ['Date',]

                console.log(r, c, parseInt(update), entryIdx, entry);

                console.log(col_tags);

            }
        }
    });


    // Set the formating for each cell
    const highlighted_cols = [col_tags['inst_apps'], col_tags['takeoffs'], col_tags['landings'], col_tags['mel'], col_tags['night'], col_tags['sim_inst'], col_tags['xc'], col_tags['dual_received'], col_tags['total']]
    for (let r = 0; r < row_translator(num_rows) + 3; r++) {
        for (let c = 0; c < num_cols; c++) {
            let styles = ""
            // Header Rows
            if (r === 0 || r === 1) styles += 'headerRow ';

            // Footer rows
            else if (r == row_translator(totals_page_row) ||
                r == row_translator(totals_forwarded_row) ||
                r == row_translator(totals_all_row)) styles += 'totalRow '
            // All other rows
            else styles += "nowrap "

            // Highlight Cells
            if (r > 1 && highlighted_cols.includes(c)) styles += 'greyHighlight '

            // Remarks
            if (r > 1 && r < row_translator(totals_page_row) && c === col_tags['remarks']) styles += 'remarks htLeft '
            else styles += 'htCenter '

            hot.setCellMeta(r, c, 'className', styles)
        }
    }


    // Define the write methods
    // All values default to ''. This means that they will write a blank space to the given cell. To prevent writing to a cell
    // at all, define the approperate metric as null
    const conv = (num) => num ? num : ''
    const write = (table_row, { date = '', type = '', ident = '', from = '', to = '', inst_apps = '', remarks = '',
        takeoffs = '', landings = '', sel = '', mel = '', dual_given = '', night = '', inst = '',
        sim_inst = '', simulator = '', xc = '', solo = '', dual_received = '', pic = '', total = '' } = {}) => {

        let changes = []

        if (date !== null) changes.push([table_row, col_tags['date'], date])
        if (type !== null) changes.push([table_row, col_tags['type'], type])
        if (ident !== null) changes.push([table_row, col_tags['ident'], ident])
        if (from !== null) changes.push([table_row, col_tags['from'], from])
        if (to !== null) changes.push([table_row, col_tags['to'], to])
        if (inst_apps !== null) changes.push([table_row, col_tags['inst_apps'], conv(inst_apps)])
        if (remarks !== null) changes.push([table_row, col_tags['remarks'], remarks])
        if (takeoffs !== null) changes.push([table_row, col_tags['takeoffs'], conv(takeoffs)])
        if (landings !== null) changes.push([table_row, col_tags['landings'], conv(landings)])
        if (sel !== null) changes.push([table_row, col_tags['sel'], conv(sel)])
        if (mel !== null) changes.push([table_row, col_tags['mel'], conv(mel)])
        if (dual_given !== null) changes.push([table_row, col_tags['dual_given'], conv(dual_given)])
        if (night !== null) changes.push([table_row, col_tags['night'], conv(night)])
        if (inst !== null) changes.push([table_row, col_tags['inst'], conv(inst)])
        if (sim_inst !== null) changes.push([table_row, col_tags['sim_inst'], conv(sim_inst)])
        if (simulator !== null) changes.push([table_row, col_tags['simulator'], conv(simulator)])
        if (xc !== null) changes.push([table_row, col_tags['xc'], conv(xc)])
        if (solo !== null) changes.push([table_row, col_tags['solo'], conv(solo)])
        if (dual_received !== null) changes.push([table_row, col_tags['dual_received'], conv(dual_received)])
        if (pic !== null) changes.push([table_row, col_tags['pic'], conv(pic)])
        if (total !== null) changes.push([table_row, col_tags['total'], conv(total)])

        return changes
    }
    const writeRow = (row, { date = '', type = '', ident = '', from = '', to = '', inst_apps = '', remarks = '',
        takeoffs = '', landings = '', sel = '', mel = '', dual_given = '', night = '', inst = '',
        sim_inst = '', simulator = '', xc = '', solo = '', dual_received = '', pic = '', total = '', clear = false } = {}) => {

        if (row >= num_rows) throw new Error("Unable to write to row " + row + ". Exceeds allocated number of rows (" + num_rows + ")")
        let table_row = row_translator(row)
        return write(table_row, { date, type, ident, from, to, inst_apps, remarks, takeoffs, landings, sel, mel, dual_given, night, inst, sim_inst, simulator, xc, solo, dual_received, pic, total, clear })
    }
    const writePageTotals = ({ date = null, type = null, ident = null, from = null, to = null, inst_apps = null, remarks = null, takeoffs = '', landings = '', sel = '', mel = '', dual_given = '', night = '', inst = '', sim_inst = '', simulator = '', xc = '', solo = '', dual_received = '', pic = '', total = '', clear = false } = {}) => {
        let table_row = row_translator(num_rows)
        return write(table_row, { date, type, ident, from, to, inst_apps, remarks, takeoffs, landings, sel, mel, dual_given, night, inst, sim_inst, simulator, xc, solo, dual_received, pic, total, clear })
    }
    const writeAmountForwarded = ({ date = null, type = null, ident = null, from = null, to = null, inst_apps = null, remarks = null, takeoffs = '', landings = '', sel = '', mel = '', dual_given = '', night = '', inst = '', sim_inst = '', simulator = '', xc = '', solo = '', dual_received = '', pic = '', total = '', clear = false } = {}) => {
        let table_row = row_translator(num_rows + 1)
        return write(table_row, { date, type, ident, from, to, inst_apps, remarks, takeoffs, landings, sel, mel, dual_given, night, inst, sim_inst, simulator, xc, solo, dual_received, pic, total, clear })
    }
    const writeTotals = ({ date = null, type = null, ident = null, from = null, to = null, inst_apps = null, remarks = null, takeoffs = '', landings = '', sel = '', mel = '', dual_given = '', night = '', inst = '', sim_inst = '', simulator = '', xc = '', solo = '', dual_received = '', pic = '', total = '', clear = false } = {}) => {
        let table_row = row_translator(num_rows + 2)
        return write(table_row, { date, type, ident, from, to, inst_apps, remarks, takeoffs, landings, sel, mel, dual_given, night, inst, sim_inst, simulator, xc, solo, dual_received, pic, total, clear })
    }

    // ----------------------------------------------------------------------
    // CSV Data Import ------------------------------------------------------
    // ----------------------------------------------------------------------
    // Get the csv data from disk
    const parse_foreflight_csv = (csv_data) => {
        // Calculate the start and end of the aircraft table
        let aircraft_table_start = csv_data.indexOf('\n', csv_data.indexOf('Aircraft Table')) + 1
        let aircraft_table_end = csv_data.indexOf('Flights Table') - 1

        // Parse the aircraft table
        let aircraft_table = Papa.parse(csv_data.substr(aircraft_table_start, aircraft_table_end - aircraft_table_start), { header: true, dynamicTyping: true })

        // Calculate the start of the flights table
        let flights_table_start = csv_data.indexOf('\n', csv_data.indexOf('Flights Table')) + 1

        // Parse the flights table
        let flights_table = Papa.parse(csv_data.substr(flights_table_start, csv_data.length - flights_table_start - 1), { header: true, dynamicTyping: true })

        flights_table.data.sort((a, b) => {

            let a_date = new Date(a.Date)
            let b_date = new Date(b.Date)

            // A was before B
            if (a_date < b_date) return 1;

            // A was after B
            else if (a_date > b_date) return -1;

            // A and B happened on the same date
            else {
                if (a.TimeOut && b.TimeOut) {
                    if (a.TimeOut < b.TimeOut) return 1;
                    else if (a.TimeOut > b.TimeOut) return -1;
                    else return 0;
                } else return 0;
            }
        })

        return { aircraft_table, flights_table }
    }

    let csv_data = false;
    let aircraft_table = undefined, flights_table = undefined


    // try {
    //     let response =  await fetch('data/logbook_n.csv')
    //     let csv_data = response.text()

    //     let result = parse_foreflight_csv(csv_data)

    //     aircraft_table = result.aircraft_table
    //     flights_table  = result.flights_table

    // } catch (err) {
    //     console.log("Invalid CSV File")
    // }

    // ----------------------------------------------------------------------
    // Update Method --------------------------------------------------------
    // ----------------------------------------------------------------------
    const format_number = (num, places = 1) => (num) ? num.toFixed(places) : ''
    const stringify = (obj, exception_keys) => {
        for (let key of Object.keys(obj)) {
            let places = 1;
            if (exception_keys.includes(key)) places = 0
            if (obj[key]) obj[key] = format_number(obj[key], places)
        }
        return obj
    }
    const update = () => {

        if (!flights_table) {
            console.error("Flights Table Empty. Please import by pressing 'n'");
            return;
        }
        // Build the change list for the current selection
        let changes = []

        // Define the totals lists
        let page_total = { takeoffs: 0, landings: 0, sel: 0, mel: 0, dual_given: 0, night: 0, inst: 0, sim_inst: 0, simulator: 0, xc: 0, solo: 0, dual_received: 0, pic: 0, total: 0 };
        let forwarded_total = { takeoffs: 0, landings: 0, sel: 0, mel: 0, dual_given: 0, night: 0, inst: 0, sim_inst: 0, simulator: 0, xc: 0, solo: 0, dual_received: 0, pic: 0, total: 0 };

        // Go through each row
        for (let i = 0; i < num_rows; i++) {
            // Get the index of the Flights Table entry
            let entry_idx = cursor + num_rows - i - 1;

            // Get the Flights Table entr
            let entry = flights_table.data[entry_idx]
            if (entry_idx > -num_rows + 1 && entry_idx < flights_table.data.length && entry !== undefined) {

                // Get the ident of the aircraft
                let ident = entry.AircraftID;

                // Get the aircraft for for this aircraft id
                let aircraft = { TypeCode: "UNKN", Class: "UNKN" }
                for (let craft of aircraft_table.data) {
                    if (craft.AircraftID == ident) {
                        // Check that the correct aircraft fields exist
                        if (!craft.Class || !craft.TypeCode) {
                            console.error('Aircraft ' + craft.AircraftID + ' is missing Class or Typecode Information! Class: ' + craft.Class + ', Typecode: ' + craft.TypeCode + '. Records concerning this aircraft will be inaccurate');
                            break;
                        }

                        // Apply this aircraft
                        aircraft = craft;
                        break;
                    }
                }

                let sel = (aircraft.Class.includes("single_engine") ? Number(entry.TotalTime) : 0)
                let mel = (aircraft.Class.includes("multi_engine") ? Number(entry.TotalTime) : 0)

                let apps = 0;
                if (entry.Approach1) apps++
                if (entry.Approach2) apps++
                if (entry.Approach3) apps++
                if (entry.Approach4) apps++
                if (entry.Approach5) apps++

                let takeoffs = Number(entry.DayTakeoffs) + Number(entry.NightTakeoffs)
                let landings = Number(entry.AllLandings)
                let dual_given = Number(entry.DualGiven)
                let night = Number(entry.Night)
                let inst = Number(entry.ActualInstrument)
                let sim_inst = Number(entry.SimulatedInstrument)
                let simulator = Number(entry.SimulatedFlight)
                let xc = Number(entry.CrossCountry)
                let solo = Number(entry.Solo)
                let dual_received = Number(entry.DualReceived)
                let pic = Number(entry.PIC)
                let total = Number(entry.TotalTime)

                page_total.takeoffs += takeoffs;
                page_total.landings += landings;
                page_total.sel += sel;
                page_total.mel += mel;
                page_total.dual_given += dual_given;
                page_total.night += night;
                page_total.inst += inst;
                page_total.sim_inst += sim_inst;
                page_total.simulator += simulator;
                page_total.xc += xc;
                page_total.solo += solo;
                page_total.dual_received += dual_received;
                page_total.pic += pic;
                page_total.total += total;

                // Add this row to the changes list
                changes.push(...writeRow(i, {
                    date: dateFns.format(entry.Date, 'MM/DD/YY'),
                    type: aircraft.TypeCode,
                    ident: ident,
                    from: entry.From,
                    to: entry.To,
                    inst_apps: apps,
                    remarks: entry.PilotComments,
                    takeoffs: format_number(takeoffs, 0),
                    landings: format_number(landings, 0),
                    sel: format_number(sel),
                    mel: format_number(mel),
                    dual_given: format_number(dual_given),
                    night: format_number(night),
                    inst: format_number(inst),
                    sim_inst: format_number(sim_inst),
                    simulator: format_number(simulator),
                    xc: format_number(xc),
                    solo: format_number(solo),
                    dual_received: format_number(dual_received),
                    pic: format_number(pic),
                    total: format_number(total)
                }))
            } else changes.push(...writeRow(i, { clear: true }))
        }

        for (let i = flights_table.data.length - 1; i >= cursor + num_rows; i--) {
            let entry = flights_table.data[i]

            // If the entry is not valid, continue.
            // TODO: Should this be a break instead?
            if (!entry) continue;

            // Get the ident of the aircraft
            let ident = entry.AircraftID

            // Get the aircraft for for this aircraft id
            let aircraft = { TypeCode: "UNKN", Class: "UNKN" }
            for (let craft of aircraft_table.data) {
                if (craft.AircraftID == ident) {
                    aircraft = craft;
                    break;
                }
            }

            let sel = (aircraft.Class.includes("single_engine") ? Number(entry.TotalTime) : 0)
            let mel = (aircraft.Class.includes("multi_engine") ? Number(entry.TotalTime) : 0)

            let apps = 0;
            if (entry.Approach1) apps++
            if (entry.Approach2) apps++
            if (entry.Approach3) apps++
            if (entry.Approach4) apps++
            if (entry.Approach5) apps++

            let takeoffs = Number(entry.DayTakeoffs) + Number(entry.NightTakeoffs)
            let landings = Number(entry.AllLandings)
            let dual_given = Number(entry.DualGiven)
            let night = Number(entry.Night)
            let inst = Number(entry.ActualInstrument)
            let sim_inst = Number(entry.SimulatedInstrument)
            let simulator = Number(entry.SimulatedFlight)
            let xc = Number(entry.CrossCountry)
            let solo = Number(entry.Solo)
            let dual_received = Number(entry.DualReceived)
            let pic = Number(entry.PIC)
            let total = Number(entry.TotalTime)

            forwarded_total.takeoffs += takeoffs;
            forwarded_total.landings += landings;
            forwarded_total.sel += sel;
            forwarded_total.mel += mel;
            forwarded_total.dual_given += dual_given;
            forwarded_total.night += night;
            forwarded_total.inst += inst;
            forwarded_total.sim_inst += sim_inst;
            forwarded_total.simulator += simulator;
            forwarded_total.xc += xc;
            forwarded_total.solo += solo;
            forwarded_total.dual_received += dual_received;
            forwarded_total.pic += pic;
            forwarded_total.total += total;
        }

        let grand_total = {
            takeoffs: forwarded_total.takeoffs + page_total.takeoffs,
            landings: forwarded_total.landings + page_total.landings,
            sel: forwarded_total.sel + page_total.sel,
            mel: forwarded_total.mel + page_total.mel,
            dual_given: forwarded_total.dual_given + page_total.dual_given,
            night: forwarded_total.night + page_total.night,
            inst: forwarded_total.inst + page_total.inst,
            sim_inst: forwarded_total.sim_inst + page_total.sim_inst,
            simulator: forwarded_total.simulator + page_total.simulator,
            xc: forwarded_total.xc + page_total.xc,
            solo: forwarded_total.solo + page_total.solo,
            dual_received: forwarded_total.dual_received + page_total.dual_received,
            pic: forwarded_total.pic + page_total.pic,
            total: forwarded_total.total + page_total.total
        };

        // Write the totals
        // Convert the totals to strings with fixed decimal places

        page_total = stringify(page_total, ['landings', 'takeoffs'])
        forwarded_total = stringify(forwarded_total, ['landings', 'takeoffs'])
        grand_total = stringify(grand_total, ['landings', 'takeoffs'])

        // Handle summation rows
        changes.push(...writePageTotals(page_total))
        changes.push(...writeAmountForwarded(forwarded_total))
        changes.push(...writeTotals(grand_total))

        // Apply the changes
        hot.setDataAtCell(changes)

        // Store this cursor as a cookie
        localStorage.setItem('logbook_manager_cursor', cursor);
    }

    // Update with the initial view
    // if (csv_data) update()

    // ----------------------------------------------------------------------
    // Key Input Handlers ---------------------------------------------------
    // ----------------------------------------------------------------------

    // Handler for key events
    const handleKey = (event) => {
        let do_update = false;
        let key_code = event.code

        // Go one entry back
        if (key_code == "ArrowUp") {

            // Down without shift should move the view up
            if (!event.shiftKey) {
                // Flag for update
                do_update = true;
                // Move the cursor up
                cursor++;

                // If the highlighted row will still be on the visible screen, then change
                // the selection. Otherwise clear the selection
                if (highlightedRow) {
                    if (highlightedRow + 1 < num_rows + 2) hot.selectCell(highlightedRow + 1, 0);
                    else clearSelectionHighlight();
                }
            }

            // Shift up should move the currently highlighted row up. Check that a row is
            // highlighted first
            else if (highlightedRow) {
                // Get the flights table entry index for this row
                let entryIdx = cursor + num_rows - highlightedRow + 1;

                // Make sure that this entry is valid and has a valid entry above it
                if (entryIdx < flights_table.data.length - 1 && entryIdx >= 0) {
                    // Get the two entries to swap
                    let entrySelected = flights_table.data[entryIdx]
                    let entrySwap = flights_table.data[entryIdx + 1];

                    // Swap the entries
                    flights_table.data[entryIdx] = entrySwap;
                    flights_table.data[entryIdx + 1] = entrySelected;

                    // Update
                    do_update = true;

                    // Change the selection such that the highlight moves with this entry
                    hot.selectCell(highlightedRow - 1, 0);
                }
            }
        }

        // Go one entry ahead
        else if (key_code == "ArrowDown") {

            // Down without shift should move the view down
            if (!event.shiftKey) {
                // Flag for update
                do_update = true;
                // Move the cursor down
                cursor--;

                // If the highlighted row will still be on the visible screen, then change
                // the selection. Otherwise clear the selection
                if (highlightedRow) {
                    if (highlightedRow - 1 >= 2) hot.selectCell(highlightedRow - 1, 0);
                    else clearSelectionHighlight();
                }
            }

            // Shift down should move the currently highlighted row down. Check that a row
            // is highlighted first
            else if (highlightedRow) {
                // Get the flights table entry index for this row
                let entryIdx = cursor + num_rows - highlightedRow + 1;

                // Make sure that this entry is valid and has a valid entry below it
                if (entryIdx < flights_table.data.length && entryIdx > 0) {
                    // Get the two entries to swap
                    let entrySelected = flights_table.data[entryIdx]
                    let entrySwap = flights_table.data[entryIdx - 1];

                    // Swap the entries
                    flights_table.data[entryIdx] = entrySwap;
                    flights_table.data[entryIdx - 1] = entrySelected;

                    // Update
                    do_update = true;

                    // Change the selection such that the highlight moves with this entry
                    hot.selectCell(highlightedRow + 1, 0);
                }
            }
        }

        // Go back one page
        else if (key_code == "ArrowLeft") {
            do_update = true;
            cursor += num_rows;

            // Clear any highlight selection
            clearSelectionHighlight();
        }

        // Go forward one page
        else if (key_code == "ArrowRight") {
            do_update = true;
            cursor -= num_rows;

            // Clear any highlight selection
            clearSelectionHighlight();
        }

        // Go to the start
        else if (key_code == "BracketLeft") {
            do_update = true;
            cursor = flights_table.data.length - num_rows;

            // Clear any highlight selection
            clearSelectionHighlight();
        }

        // Go to the end
        else if (key_code == "BracketRight") {
            do_update = true;
            cursor = 0;

            // Clear any highlight selection
            clearSelectionHighlight();
        }

        else if (key_code == "Escape") {
            // Clear any highlight selection
            clearSelectionHighlight();

            // Update the screen
            do_update = true;
        }

        else if (key_code == "KeyN") {
            // Stop the normal actions from the 'n' key
            event.stopImmediatePropagation()
            event.preventDefault();

            // Clear any highlight selection
            clearSelectionHighlight();

            // Prompt the user for a file uplad
            var input = document.createElement('input');
            input.type = 'file';
            input.onchange = e => {
                // getting a hold of the file reference
                var file = e.target.files[0];
                // setting up the reader
                var reader = new FileReader();
                reader.readAsText(file, 'UTF-8');
                // here we tell the reader what to do when it's done reading...
                reader.onload = readerEvent => {

                    console.log("Loaded csv file from disk")

                    var content = readerEvent.target.result; // this is the content!
                    let results = parse_foreflight_csv(content)

                    aircraft_table = results.aircraft_table
                    flights_table = results.flights_table

                    localStorage.setItem('logbook_manager_aircraft_table', JSON.stringify(aircraft_table));
                    localStorage.setItem('logbook_manager_flights_table', JSON.stringify(flights_table));

                    console.log(aircraft_table.data.length + " Aircraft Records Found")
                    console.log(flights_table.data.length + " Flight Records Found")

                    // Adjust the cursor
                    if (cursor < -num_rows + 1) cursor = -num_rows + 1
                    else if (cursor > flights_table.data.length - 1) cursor = flights_table.data.length - 1
                    console.log("Cursor set to " + cursor)

                    // update the screen
                    update()
                }
            }
            input.click();
        }

        // else console.log(key_code)

        if (do_update) {

            // Stop the normal actions for this key input
            event.stopImmediatePropagation()
            event.preventDefault();

            // Adjust the cursor before we update
            // Prevent from scrolling into the future
            if (cursor < -num_rows + 1) cursor = -num_rows + 1
            // Prevent from scrolling into the past before the first logbook entry
            else if (cursor > flights_table.data.length - 1) cursor = flights_table.data.length - 1

            // update the screen
            update()
        }
    }

    // Handle key input when the user is selected on the table
    hot.addHook('beforeKeyDown', handleKey);

    // Handle key input when the user is selected outside the table
    hotkeys('right,left,up,down,[,],n,u', handleKey);

    // Issolated scope to preserve memory. Once the localStorage temp values are done being used,
    // they can be released
    {
        let stored_aircraft_table = localStorage.getItem('logbook_manager_aircraft_table');
        let stored_flights_table = localStorage.getItem('logbook_manager_flights_table');

        if (stored_aircraft_table) aircraft_table = JSON.parse(stored_aircraft_table);
        if (stored_flights_table) flights_table = JSON.parse(stored_flights_table);
    }

    console.log("Aircraft Table", aircraft_table);
    console.log("Flights Table", flights_table);


    if (aircraft_table && flights_table) update();

    /*

    
    // Write data
    for (let i = 0; i < num_rows; i++)
        changes.push(...writeRow(i, { date: '10/20/20', type: 'C172', ident: 'N55404', from: 'KLZU', to: 'KLZU', inst_apps: 1, remarks: 'Remarks here!', takeoffs: 2, landings: 3, sel: 4, mel: 5, dual_given: 6, night: 7, inst: 8, sim_inst: 9, simulator: 10, xc: 11, solo: 12, dual_received: 13, pic: 14, total: 15 }))

    changes.push(...writePageTotals({ takeoffs: 0, landings: 3, sel: 4, mel: 5, dual_given: 6, night: 7, inst: 8, sim_inst: 9, simulator: 10, xc: 11, solo: 12, dual_received: 13, pic: 14, total: 15 }))
    changes.push(...writeAmountForwarded({ takeoffs: 1, landings: 3, sel: 4, mel: 5, dual_given: 6, night: 7, inst: 8, sim_inst: 9, simulator: 10, xc: 11, solo: 12, dual_received: 13, pic: 14, total: 15 }))
    changes.push(...writeTotals({ takeoffs: 2, landings: 3, sel: 4, mel: 5, dual_given: 6, night: 7, inst: 8, sim_inst: 9, simulator: 10, xc: 11, solo: 12, dual_received: 13, pic: 14, total: 15 }))
    hot.setDataAtCell(changes)


    // setTimeout(function () {
    //     writeRow(0)
    // }, 1000);

    */

});


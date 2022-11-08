define((require) => {

    class TableManager {
        constructor(container, { styler = undefined, model = undefined, entry_translater = undefined, total_translater = undefined } = {}) {
            // Define the HTML container for the logbook
            this.container = container;

            // Set the styler 
            this.setStyler(styler);

            // Set the data model
            this.setModel(model);

            // Start with an undefined handsontable
            this.hot = undefined;

            // Load the stored cursor
            this.load_cursor();

            console.log("Loaded Cursor", this.cursor);

            this.entry_translater = entry_translater;
            this.total_translater = total_translater;

            // Set up the hightlight information
            this.lastRowClass = [];

            // For storing the selected cell
            this.selected = {
                row: null,
                col: null
            };

            // For storing the last selected cell
            this.last_selected = {
                row: null,
                col: null
            }

            // Id used to denote the TimoutID associated with the long render process. This render
            // process occurs sometime after the user stops interacting with the interface in order
            // to facilitate a more responsive user experiance
            this.styleRenderTimeoutId = undefined;

            // Whether or not modifier styles are currently rendered
            this.modiferStylesRendered = false;
        }

        init() {
            // Ensure that a styler has been defined
            if (!this.styler) return undefined;

            // Set up the row selection information
            this.selected = {
                row: null,
                col: null
            };
            this.last_selected = {
                row: null,
                col: null
            }
            this.lastRowClass = [];

            // Set up the settings object for the handsontable object
            const settings = {
                data: this.styler.data,
                // width: '100%',
                rowHeaders: false,
                colHeaders: false,
                colWidths: this.styler.col_widths,
                mergeCells: this.styler.merge_cells,
                readOnly: true,
                selectionMode: 'single',
                disableVisualSelection: true,
                customBorders: this.styler.borders,
                licenseKey: 'non-commercial-and-evaluation'
            }
            this.hot = new Handsontable(this.container, settings);

            // Now that the handsontable has been generated, apply its style
            this.styler.apply_style(this.hot);

            // Set up the manager to handle afterChange hooks from handsontable
            this.hot.addHook('afterChange', (change, source) => {
                // Only listen for edit undo, edit redo, and basic edits
                if (source == 'UndoRedo.undo' || source == 'UndoRedo.redo' || source == 'edit') {

                    console.log('edit');

                    // Only look at edits with a single change. This limits our search to only those edits
                    // which the user made. Automated edits can edit hundreds of cells at once
                    if (change.length == 1) {
                        // Only look at the first change
                        let edit = change[0];

                        // Get the HOT row and col form the edit information
                        let r = edit[0],
                            c = edit[1];

                        // Get the update text from the edit
                        let update = edit[3];

                        // Only update the database if the input is a number
                        if (!isNaN(update)) {
                            // Set the correct data in the model
                            this.model.set_value(this.row_hot_to_data(r), this.styler.get_source(c), Number(update));

                            // Calculate the new totals with this change
                            this.model.calculate_total();
                        }

                        // Render the logbook view
                        this.render();
                    }
                }
            });

            // Render the logbook
            this.render(true);

            // Return the handsontable
            return this.hot;
        }

        // Load the cursor from loalStorage
        load_cursor() {
            // Get the cursor from localStorage
            let stored_cursor = localStorage.getItem('logbook_manager_cursor');
            // If the cursor is not defined in storage, then set it to 0 for now
            if (!stored_cursor || isNaN(stored_cursor)) this.cursor = 0;

            // Otherwise, use the stored cursor
            else {
                // Convert the stored cursor to an int
                let raw_cursor = parseInt(stored_cursor);

                // Fence the cursor to the current data (incase the last cursor was invalid for this data)
                this.cursor = this.fence_cursor(raw_cursor);
            }


            // Return the cursor
            return this.cursor;
        }

        store_cursor(cursor = null) {

            // If the cursor value is defined, then set the cursor based on it
            if (cursor) this.cursor = cursor;

            // Store the cursor to localstorage
            localStorage.setItem('logbook_manager_cursor', this.cursor);

            // Return the cursor
            return this.cursor;
        }

        // Clear the row selection
        clear_selection(render = false) {

            // If there is actually a row selected, then proceed
            if (this.selected.row !== null) {

                // Go through each column and see what the selected row's class was last. Set the
                // row back to its original class 
                for (var i = 0; i < this.hot.countCols(); i++) {
                    let className = this.lastRowClass[i];
                    this.hot.setCellMeta(this.selected.row, i, 'className', className);
                }

                // Clear state vars for the selected row and column
                this.selected.row = null;
                this.selected.col = null;

                // Clear the stored last row class information
                this.lastRowClass = [];

                // Render if needed
                if (render) this.hot.render();
            }
        }

        // Select the given row
        select(r, c = null, render = true) {
            // If there was a last selected row and col, then set it to readonly and clear the last selected
            if (this.last_selected.row !== null) {
                this.hot.setCellMeta(this.last_selected.row, this.last_selected.col, 'readOnly', true);
                this.last_selected.row = null;
                this.last_selected.col = null;
            }

            // This row is not already selected
            if (this.selected.row === null || this.selected.row !== r) {
                // Clear any row selection
                this.clear_selection();

                // Change the style for the row to be selected
                for (var i = 0; i < this.hot.countCols(); i++) {
                    let className = this.hot.getCellMeta(r, i).className;
                    this.lastRowClass[i] = className;
                    this.hot.setCellMeta(r, i, 'className', className + 'select');
                }

                // Render the table if needed
                if (render) this.hot.render();

            }

            // If this cell has been double clicked, and it is an editable cell
            else if (this.selected.row = r && this.selected.col == c && this.styler.cell_editable(r, c)) {
                this.last_selected.row = r;
                this.last_selected.col = c;
                this.hot.setCellMeta(r, c, 'readOnly', false);
            }

            // Store the selected row and col
            this.selected.row = r;
            this.selected.col = c;
        }

        render(first_render = false) {
            console.time('Render');

            if (this.modiferStylesRendered) this.remove_modifier_styles();

            // Limit the cursor
            this.cursor = this.fence_cursor(this.cursor);

            // Store the cursor
            this.store_cursor();

            // Remove all tooltips within the container
            $('body').tooltip('destroy');

            // Prepare a list of changes
            let changes = []
            // Itterate through the list of sources for this logbook
            for (let col_name of this.styler.source_idx) {
                // If the column is not defined, then continue
                if (!col_name) continue;

                // Get the handsontable column index for the given column name.
                // Also get whether or not it is summable, and the formatter to use
                // for the column
                const { col, summable, tooltip, formatter } = this.styler.get_col(col_name);

                // Go through each row in this column
                for (let page_row = 0; page_row < this.styler.num_rows; page_row++) {

                    // Get the data index to display on this row of the logbook page. The 
                    // data entries are displayed in reverse order (newer events at the end),
                    // and we adjust the value based on the cursor
                    const d_row = this.row_view_to_data(page_row);

                    // Get the data for this row and column name from the model
                    let data = null;
                    // Issolated scope to prevent data_obj from precisting
                    {
                        const data_obj = this.model.get(d_row, col_name)
                        if (data_obj !== null && data_obj !== undefined) {
                            data = formatter(data_obj.value);
                        }
                    }

                    // Push the change to the changes list
                    // if (mod_text) changes.push([this.styler.row_view_to_hot(page_row), col, data + mod_text]);
                    changes.push([this.styler.row_view_to_hot(page_row), col, data]);

                    // If this is the first render then create the empty tooltip for this cell and 
                    // disable it
                    if (first_render) {
                        const cell = this.hot.getCell(this.styler.row_view_to_hot(page_row), col);
                        $(cell).tooltip({ trigger: 'hover', html: true, title: null, placement: "auto top", container: 'body' }).tooltip('disable');
                    }
                }

                // If this column is summable, then produce the sum
                if (summable) {
                    let { col, page_row, forward_row, grand_row } = this.styler.get_totals(col_name);

                    // Page end is the cursor location
                    let page_end_idx = this.fence_cursor(this.cursor);

                    // Page start is the cursor location plus (back in time) the number of rows - 1
                    // Minus 1 withing the fence and plus 1 outside the fence to allow it to stretch back
                    // one more index, past the start of the data. This will allow it to show 0 for the amount
                    // forwarded when on page 1 of the logbook
                    let page_start_idx = this.fence_cursor(this.cursor + this.styler.num_rows - 1) + 1;

                    // Push the page total changes
                    // Page Total starts at page_start_itx and goes until page_end_idx
                    let data = formatter(this.model.sum(col_name, page_end_idx, page_start_idx));
                    changes.push([page_row, col, data]);

                    // Forwarded Total starts at the start of the data and ends at page_forward_idx
                    data = formatter(this.model.sum(col_name, page_start_idx));
                    changes.push([forward_row, col, data]);

                    // Grand Total starts at the start of the data and ends at page_end_idx
                    data = formatter(this.model.sum(col_name, page_end_idx));
                    changes.push([grand_row, col, data]);
                }
            }

            // Apply the changes
            this.hot.setDataAtCell(changes);

            // Stage a modifier style render
            this.stage_modifier_style_render();

            console.timeEnd('Render');
        }

        // Render styles for specific cells with modifiers. This, for example, allows cells to show
        // whether or not they have changed
        render_modifier_styles(remove = false) {

            const styleList = ['edited', 'derived'];

            // List of style changes on screen to be made
            let style_changes = [];

            // Itterate through the list of sources for this logbook
            for (let col_name of this.styler.source_idx) {
                // If the column is not defined, then continue
                if (!col_name) continue;

                // Get the handsontable column index for the given column name.
                // Also get whether or not it is summable, and the formatter to use
                // for the column
                const { col, summable, tooltip, formatter } = this.styler.get_col(col_name);

                // Go through each row in this column
                for (let page_row = 0; page_row < this.styler.num_rows; page_row++) {
                    // Get the handsontable row index as well
                    const h_row = this.styler.row_view_to_hot(page_row);

                    // Get the HTML cell container for this cell
                    const cell = this.hot.getCell(this.styler.row_view_to_hot(page_row), col);

                    // If we are removing all modifer styles from the table, then do that here
                    if (remove) {
                        // Get the current style and className for this cell
                        const cur_style = this.hot.getCellMeta(h_row, col);
                        let className = cur_style.className
                        const origClassName = className;

                        // If the classname includes one of the style modifiers, then remove that style
                        for (const style of styleList)
                            className = className.replaceAll(style, '');

                        // If the className was changed at all, apply it
                        if (className !== origClassName) style_changes.push([h_row, col, className]);
                        
                        // Disable the tooltip for this cell
                        $(cell).tooltip('disable');

                    } else {

                        // Don't add any styles to this row if it is selected. Otherwise we can
                        // write over the selection row with our style
                        if (this.selected.row === h_row) continue;

                        // Get the data index to display on this row of the logbook page. The 
                        // data entries are displayed in reverse order (newer events at the end),
                        // and we adjust the value based on the cursor
                        const d_row = this.row_view_to_data(page_row);

                        // Modifier placeholder
                        let modifier = {};
                        // Get the data for this row and column name from the model
                        let data = null;
                        // Issolated scope to prevent data_obj from precisting
                        {
                            const data_obj = this.model.get(d_row, col_name)
                            if (data_obj !== null && data_obj !== undefined) {
                                modifier = data_obj.modifier;
                                data = formatter(data_obj.value);
                            }
                        }

                        // Gather a list of all of the styles that should be applied to this cell
                        let className = '';
                        for (const style of styleList)
                            if ('style' in modifier && style in modifier.style) className += style + ' ';

                        // If any styles were added, then apply the changes
                        if (className !== '') style_changes.push([h_row, col, className]);

                        // Handle the tooltip for this cell
                        // By default let's assume the tooltip should be blank
                        let tooltip_data = '';

                        // If a tooltip was set manualy, then determine how to display it 
                        if (tooltip) {

                            // If the tooltip is a string, then it is refering to another value from the entry to display
                            if (typeof tooltip == 'string') {
                                // Get the value from the entry to display
                                tooltip_data = this.model.get_value(d_row, tooltip);
                                // If the tooltip is an empty list, then set it to null instead
                                if (Array.isArray(tooltip_data) && tooltip_data.length == 0) tooltip_data = null;
                            }

                            // If the tooltip is a function, then call the function to determine the tooltip
                            else if (typeof tooltip == 'function') {
                                // Run the tooltip with the entire entry's worth of data
                                tooltip_data = tooltip(this.model.get(d_row));
                            }

                            // If the tooltip is a simple boolean true, then display the cell data 
                            else if (typeof tooltip == 'boolean') tooltip_data = data
                        }

                        // If the tooltip was not set manually, then check to see if the cell has
                        // a tooltip entry in its modifier data. If so, display that instead
                        else {
                            const d = this.model.get(d_row, col_name);
                            if (d && d.modifier.tooltip) tooltip_data = d.modifier.tooltip
                        }

                        // If there is actually data to display in the tooltip, then do so
                        if (tooltip_data !== '')
                            $(cell).tooltip('hide').attr('data-original-title', tooltip_data).tooltip('enable');

                        // If there is not valid data, then disable it
                        else $(cell).tooltip('disable');
                    }
                }
            }

            // this.styler.apply_style(this.hot);
            this.styler.apply_style_changes(this.hot, style_changes);

            if (remove) this.modiferStylesRendered = false;
            else this.modiferStylesRendered = true;
        }

        remove_modifier_styles() {
            return this.render_modifier_styles(true);
        }

        stage_modifier_style_render() {
            clearTimeout(this.styleRenderTimeoutId);

            const _this = this;
            this.styleRenderTimeoutId = setTimeout(function () { _this.render_modifier_styles(); }, 500);
        }

        // Adjust the cursor so that it is a valid value
        fence_cursor(cursor) {
            if (cursor >= this.model.num_entries) cursor = this.model.num_entries - 1;
            else if (cursor <= -this.styler.num_rows) cursor = -this.styler.num_rows + 1;
            return cursor;
        }

        // See if the given cursor value is valid (ie it won't be moved)
        validate_cursor(cursor) {
            return this.fence_cursor(cursor) == cursor;
        }

        // Gets the row in the data model, given the view row provided
        row_view_to_data(view_row) {
            return this.styler.num_rows - view_row - 1 + this.cursor;
        }

        // Gets the row in the data model, given the hot row provided
        row_hot_to_data(hot_row) {
            if (!this.styler.row_within_view(hot_row)) return -1;
            // else return this.styler.num_rows - this.cursor - hot_row + 1;
            else return this.row_view_to_data(hot_row - this.styler.header_fields.length)
        }

        // Cursor up
        up() {
            this.cursor++;
            if (this.validate_cursor(this.cursor)) this.select_down();
        }

        // Cursor down
        down() {
            this.cursor--;
            if (this.validate_cursor(this.cursor)) this.select_up();
        }

        // Cursor next page
        next() {
            this.cursor -= this.styler.num_rows;
            this.clear_selection();
        }

        // Cursor last page
        prev() {
            this.cursor += this.styler.num_rows;
            this.clear_selection();
        }

        // Cursor to the start
        start() {
            this.cursor = this.model.num_entries - this.styler.num_rows;
            this.clear_selection();
        }

        // Cursor to the end
        end() {
            this.cursor = 0;
            this.clear_selection();
        }

        // Move the row selection up (like selecting the row above it instead)
        select_up() {
            if (this.selected.row !== null && this.styler.row_within_view(this.selected.row - 1)) this.select(this.selected.row - 1)
            else this.clear_selection();
        }

        // Move the row selection down (like selecting the row below it instead)
        select_down() {
            if (this.selected.row !== null && this.styler.row_within_view(this.selected.row + 1)) this.select(this.selected.row + 1)
            else this.clear_selection();
        }

        // Swap the selected row with the one above it
        swap_up() {
            if (this.selected.row !== null) {
                // Get the flights table entry index for this row
                let entryIdx = this.cursor + this.styler.num_rows - this.selected.row + 1;

                // Make sure that this entry is valid and has a valid entry above it
                if (entryIdx < this.model.entries.length - 1 && entryIdx >= 0) {
                    // Swap this entry and the one above it
                    this.model.swap(entryIdx, entryIdx + 1);

                    // Change the selection such that the highlight moves with this entry
                    this.select_up();

                }
            }
        }

        // Swap the selected row with the one below it
        swap_down() {
            if (this.selected.row !== null) {
                // Get the flights table entry index for this row
                let entryIdx = this.cursor + this.styler.num_rows - this.selected.row + 1;

                // Make sure that this entry is valid and has a valid entry above it
                if (entryIdx < this.model.entries.length && entryIdx > 0) {
                    // Swap this entry and the one below it
                    this.model.swap(entryIdx, entryIdx - 1);

                    // Change the selection such that the highlight moves with this entry
                    this.select_down();

                }
            }
        }

        toggle_wrapping() {
            this.styler.wrap_text = !this.styler.wrap_text;
            this.styler.style_body();
            this.styler.apply_style(this.hot, this.styler.wrap_text ? 'wrap' : '');
        }

        // Setter methods
        setStyler(styler) {
            this.styler = styler;
        }
        setModel(model) {
            this.model = model;
        }
        setEntryTranslater(translater) {
            this.entry_translater = translater;
        }
        setTotalTranslater(translater) {
            this.total_translater = translater;
        }

    }
    return TableManager;
});
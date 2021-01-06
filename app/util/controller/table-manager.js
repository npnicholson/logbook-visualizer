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

            console.log("Loaded Cursor", this.cursor)

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

        clear_selection(render = false) {
            if (this.selected.row !== null) {

                for (var i = 0; i < this.hot.countCols(); i++) {
                    let className = this.lastRowClass[i];
                    this.hot.setCellMeta(this.selected.row, i, 'className', className);
                }
                this.selected.row = null;
                this.selected.col = null;
                this.lastRowClass = [];

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

                // Render the table if needded
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
            // Limit the cursor
            this.cursor = this.fence_cursor(this.cursor);

            // Store the cursor
            this.store_cursor();

            // Remove all tooltops within the container
            // $('body').tooltip('dispose');
            $('body').tooltip('destroy');
        

            // Prepare a list of changes
            let changes = []
            let style_changes = [];
            // Itterate through the list of sources for this logbook
            for (let col_name of this.styler.source_idx) {
                // If the column is not defined, then continue
                if (!col_name) continue;

                // Get the handsontable column index for the given column name.
                // Also get whether or not it is summable, and the formatter to use
                // for the column
                let { col, summable, tooltip, formatter } = this.styler.get_col(col_name);

                // Go through each row in this column
                for (let page_row = 0; page_row < this.styler.num_rows; page_row++) {

                    // Get the data index to display on this row of the logbook page. The 
                    // data entries are displayed in reverse order (newer events at the end),
                    // and we adjust the value based on the cursor
                    let d_row = this.row_view_to_data(page_row);

                    // Get the data for this row and column name from the model
                    let data = null, modifier = {};
                    // Issolated scope to prevent data_obj from precisting
                    {
                        let data_obj = this.model.get(d_row, col_name)
                        if (data_obj !== null && data_obj !== undefined) {
                            data = formatter(data_obj.value);
                            modifier = data_obj.modifier;
                        }
                    }

                    if ('edited' in modifier) {
                        // mod_text = "*";
                        style_changes.push([this.styler.row_view_to_hot(page_row), col, 'edited']);
                    }

                    // If this column has a tooltip, then add a tooltop to this cell
                    if (tooltip) {
                        // Get the container for this cell
                        let cell = this.hot.getCell(this.styler.row_view_to_hot(page_row), col);

                        // By default, lets assume that the tooltip is a boolean true. This would denote 
                        // the tooltop should reference this specific value
                        let tooltip_data = data;

                        // If the tooltip is a string, then it is refering to another value from the entry to display
                        if (typeof tooltip == 'string') {
                            // Get the value from the entry to display
                            tooltip_data = this.model.get_value(d_row, tooltip);
                            // If the tooltip is an empty list, then set it to null instead
                            if (Array.isArray(tooltip_data) && tooltip_data.length == 0) tooltip_data = null;
                        } else if (typeof tooltip == 'function') {
                            // Run the tooltip with the entire entry's worth of data
                            tooltip_data = tooltip(this.model.get(d_row));
                        }

                        // If there is actually data to display in the tooltip, then do so
                        if (tooltip_data) {
                            // If this is the first time rendering, then generate a new tooltop with all of the correct settings
                            if (first_render) $(cell).tooltip({ trigger: 'hover', html: true, title: tooltip_data, placement: "auto top", container: 'body' });

                            // If this is not the first render, then simply update the tooltip that already exists
                            else $(cell).tooltip('hide').attr('data-original-title', tooltip_data).tooltip('enable');
                        }

                        // If there is not valid data, then disable it
                        else {
                            // If this is the first time rendering, then generate a new tooltop with all of the correct settings, and disable it
                            if (first_render) $(cell).tooltip({ trigger: 'hover', html: true, title: null, placement: "auto top", container: 'body' }).tooltip('disable');

                            // If this is not the first render, then simply disable the tooltip that already exists
                            else $(cell).tooltip('disable');
                        }
                    }

                    // Push the change to the changes list
                    // if (mod_text) changes.push([this.styler.row_view_to_hot(page_row), col, data + mod_text]);
                    changes.push([this.styler.row_view_to_hot(page_row), col, data]);
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

            // Apply the style changes
            // this.styler.apply_style(this.hot);
            // this.styler.apply_style_changes(this.hot, style_changes);

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
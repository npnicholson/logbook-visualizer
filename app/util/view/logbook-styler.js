define((require) => {
    class LogbookStyler {
        constructor({
            // List of columns
            columns,

            // Text Customizations
            page_total_name = 'Totals This Page',
            forward_total_name = 'Amount Forwarded',
            grand_total_name = 'Totals to Date',
            signature_text = 'I certify that the entries in this log are true,\n_________________________________\nPILOT SIGNATURE',

            // Number of Rows
            num_rows = 13,

            // Custom Borders
            borders = [],

            // Row Seperator Borders
            row_border_enabled = true,
            row_border_offset = 1,
            row_border_spacing = 3,
            row_border_color = '#AAAAAA',

            // Header Border
            header_border_color = '#5292F7',
            header_border_enabled = true,

            // Footer Border
            footer_border_color = '#5292F7',
            footer_border_enabled = true,

            // Custom cell changes
            custom_merge_cells = [],
            custom_data = [],

            // Defaults to Not Wrapping Text (Cuttoff)
            wrap_text = false

        } = {}) {
            // Assign columns and num_rows
            this.columns = columns;
            this.num_rows = num_rows;

            // Assign custom borders
            this.border_settings = borders;

            // Init Empty Data
            this.data = [];
            this.cell_style = [];

            // Start of the summation area
            this.summation_start = -1;

            this.custom_merge_cells = custom_merge_cells;
            this.custom_data = custom_data;

            this.wrap_text = wrap_text;

            // Basic formatter to use if none is defiend for a given column
            this.formatter = val => val;

            // Build the settings object
            this.settings = {
                border: {
                    row: {
                        offset: row_border_offset,
                        spacing: row_border_spacing,
                        color: row_border_color,
                        enabled: row_border_enabled,
                    },
                    header: { color: header_border_color, enabled: header_border_enabled },
                    footer: { color: footer_border_color, enabled: footer_border_enabled },
                },
                text: {
                    page_total: page_total_name,
                    forward_total: forward_total_name,
                    grand_total: grand_total_name,
                    signature: signature_text
                }
            };

        }

        build() {
            // Init the top and bottom header rows
            let h0 = [], h1 = [];

            // Init some empty lists and objects
            this.merge_cells = this.custom_merge_cells;
            this.col_widths = [];
            this.source_names = {};
            this.source_formatters = {};
            this.source_idx = [];
            this.editable = [];

            // Whether or not this column is summable
            this.summable = [];
            this.tooltip = [];
            this.style = { highlight: [], text: [] };

            // Start at col number 0
            this.num_cols = 0;

            // Go through each field of the config
            for (let entry of this.columns) {

                // If the entry only has one column
                if (entry.cols.length == 1) {
                    // Get the specific column
                    let col = entry.cols[0];

                    // Add this column to the source_names object so that it is easier to find 
                    // this column later by name
                    if (col.source) {
                        this.source_names[col.source] = this.num_cols;
                        if (col.formatter) this.source_formatters[col.source] = col.formatter;
                        else this.source_formatters[col.source] = this.formatter;
                    }
                    this.source_idx[this.num_cols] = col.source;
                    this.summable[this.num_cols] = col.sum;
                    this.tooltip[this.num_cols] = col.tooltip;

                    // Add the width to the col_widths list
                    this.col_widths.push(col.width)

                    // Add the field title to the top row
                    h0.push(col.title);

                    // Add nothing to the bottom row
                    h1.push('');

                    // Set up the merge_cells entry for the top row to span down onto the 
                    // bottom row
                    this.merge_cells.push({ row: 0, col: this.num_cols, rowspan: 2, colspan: 1 });

                    // Find the start of the summation area (the first summed column)
                    if (col.sum && this.summation_start == -1) this.summation_start = this.num_cols - 1;

                    // Add this column to the highlighted list if needed
                    if (col.highlight) this.style.highlight.push(this.num_cols);
                    if (col.text) this.style.text.push(this.num_cols);

                    // Move our "Cursor" over by one space
                    this.num_cols++;

                } else {
                    let starting_col = this.num_cols;

                    // Go through each column in this entry
                    for (let col of entry.cols) {
                        // Add this column to the source_names object so that it is easier to find 
                        // this column later by name
                        if (col.source) {
                            this.source_names[col.source] = this.num_cols;
                            if (col.formatter) this.source_formatters[col.source] = col.formatter;
                            else this.source_formatters[col.source] = this.formatter;
                        }
                        this.source_idx[this.num_cols] = col.source;
                        this.summable[this.num_cols] = col.sum;
                        this.tooltip[this.num_cols] = col.tooltip;

                        // Add the width to the col_widths list
                        this.col_widths.push(col.width)

                        // The top row is the header title
                        h0.push(entry.title);

                        // The bottom row is the column title
                        h1.push(col.title)

                        // Find the start of the summation area (the first summed column)
                        if (col.sum && this.summation_start == -1) this.summation_start = this.num_cols - 1;

                        // Add this column to the highlighted list if needed
                        if (col.highlight) this.style.highlight.push(this.num_cols);
                        if (col.text) this.style.text.push(this.num_cols);

                        // Move our "Cursor" over by one space
                        this.num_cols++;
                    }

                    // Set up the merge_cells entry for the top row. It should span num_cols
                    // columns in total
                    this.merge_cells.push({ row: 0, col: starting_col, rowspan: 1, colspan: entry.cols.length })
                }
            }

            // Store the header rows in header_fields for the user if needed
            this.header_fields = [h0, h1];

            // Add the header rows to the data
            this.data = [h0, h1];

            // ---------- Body ---------- //

            // Add row data to the data
            for (let r = 0; r < this.num_rows; r++) {
                let row = [];

                for (let c = 0; c < this.num_cols; c++) row.push('');
                this.data.push(row);
            }

            // ---------- Footer ---------- //

            // Add three summation rows
            for (let row = 0; row < 3; row++) {
                let row = [];
                for (let idx = 0; idx < this.num_cols; idx++) {
                    row.push('');
                }
                this.data.push(row);
            }

            // Use summation_start to figure out when to start the summation rows on
            // the logbook page. This is calculated during the header build process

            // this.data[this.row_view_to_hot(this.num_rows)][0] = this.settings.text.signature;
            // this.merge_cells.push({ row: this.row_view_to_hot(this.num_rows), col: 0, rowspan: 3, colspan: this.summation_start });

            // Add the title text
            this.data[this.row_view_to_hot(this.num_rows + 0)][this.summation_start] = this.settings.text.page_total;
            this.data[this.row_view_to_hot(this.num_rows + 1)][this.summation_start] = this.settings.text.forward_total;
            this.data[this.row_view_to_hot(this.num_rows + 2)][this.summation_start] = this.settings.text.grand_total;

            // Store the totals source columns
            this.total_source = {
                page: this.num_rows,
                forward: this.num_rows + 1,
                grand: this.num_rows + 2
            }

            // ---------- Style ---------- //
            /*  
                [
                    { reference: 'data', row: 0,  top: '#5292F7' }, // Row 0, referencing the data area (not the header)
                    { row: 0,  top: '#5292F7' }, // Row 0, referenceing the data area (not the header)
                    { reference: 'raw', row: 0,  top: '#5292F7' }, // Row 0, (actual row 0, in the header)
                    { col: 3, left:'#5292F7' }, // Col 3
                    { col: 'pic', top: '#5292F7', bottom:'#5292F7', left:'#5292F7', right:'#5292F7' }, // The 'pic' column
                ]
            */
            this.borders = []
            for (let field of this.border_settings) {
                let entry = {}

                // If the field references the data, then translate its row correctly
                if ('row' in field && (!('reference' in field) || field.reference == 'data'))
                    field.row = this.row_view_to_hot(field.row);

                if ('col' in field && isNaN(field.col)) field.col = this.get_col(field.col);

                console.log(field);

                // If there is no row and field information, then continue
                if (!('row' in field) && !('col' in field)) continue;

                // Rows and not cols
                if ('row' in field && !('col' in field)) entry.range = {
                    from: { row: field.row, col: 0 },
                    to: { row: field.row, col: this.num_cols }
                }

                // Cols and not rows
                if ('col' in field && !('row' in field)) entry.range = {
                    from: { row: 0, col: field.col },
                    to: { row: this.row_view_to_hot(this.num_rows - 1) + 3, col: field.col }
                }

                // Cols and  rows
                if ('row' in field && 'col' in field) entry.range = {
                    from: { row: field.row, col: field.col },
                    to: { row: field.row, col: field.col },
                }

                // Top Border
                if ('top' in field) entry.top = {
                    width: 2,
                    color: field.top
                }

                // Bottom Border
                if ('bottom' in field) entry.bottom = {
                    width: 2,
                    color: field.bottom
                }

                // Left Border
                if ('left' in field) entry.left = {
                    width: 2,
                    color: field.left
                }

                // Right Border
                if ('right' in field) entry.right = {
                    width: 2,
                    color: field.right
                }

                // Apply the border settings
                this.borders.push(entry)
            }

            // Add the auto border settings (row seperators, header and footer seperators, etc)
            // Only do the row seperators if the row border is enabled
            if (this.settings.border.row.enabled) {
                for (let idx = this.settings.border.row.offset; idx < this.num_rows; idx += this.settings.border.row.spacing) {
                    this.borders.push({
                        range: {
                            from: { row: this.row_view_to_hot(idx), col: 0 },
                            to: { row: this.row_view_to_hot(idx), col: this.num_cols }
                        },
                        bottom: { width: 2, color: this.settings.border.row.color }
                    })
                }
            }

            // Only add the header border if it is enabled
            if (this.settings.border.header.enabled) {
                this.borders.push({
                    range: {
                        from: { row: this.row_view_to_hot(0), col: 0 },
                        to: { row: this.row_view_to_hot(0), col: this.num_cols }
                    },
                    top: { width: 2, color: this.settings.border.header.color }
                });
            }

            // Only add the footer border if it is enabled
            if (this.settings.border.footer.enabled) {
                this.borders.push({
                    range: {
                        from: { row: this.row_view_to_hot(this.num_rows - 1), col: 0 },
                        to: { row: this.row_view_to_hot(this.num_rows - 1), col: this.num_cols }
                    },
                    bottom: { width: 2, color: this.settings.border.footer.color }
                });
            }

            let num_header_rows = this.header_fields.length;

            // Apply header row style
            for (let r = 0; r < num_header_rows; r++) {
                this.cell_style.push([]);
                for (let c = 0; c < this.num_cols; c++) {
                    this.cell_style[this.cell_style.length - 1][c] = 'headerRow htCenter ';
                }
            }

            // Apply entry body style
            this.style_body();

            // Apply footer row style
            for (let r = num_header_rows + this.num_rows; r < num_header_rows + this.num_rows + 3; r++) {
                this.cell_style.push([]);
                for (let c = 0; c < this.num_cols; c++) {
                    // Define the style for this cell
                    let styles = 'totalRow ';

                    // If this is the column for the summation text, then set as nowrap htLeft.
                    // Otherwise (signature and all other columns), set as centered
                    if (c == this.summation_start) styles += 'nowrap htLeft ';
                    else styles += 'htCenter ';

                    // Highlight Cells
                    if (this.style.highlight.includes(c)) styles += 'greyHighlight ';

                    // Add this style to the cell styles
                    this.cell_style[this.cell_style.length - 1][c] = styles;
                }
            }


            // Apply any custom data
            for (let entry of this.custom_data) this.data[entry.row][entry.col] = entry.data;

            // Return the data and borders
            return { data: this.data, borders: this.borders };
        }

        // Style the body
        style_body() {
            let num_header_rows = this.header_fields.length;
            for (let r = num_header_rows; r < num_header_rows + this.num_rows; r++) {
                this.cell_style.push([]);
                for (let c = 0; c < this.num_cols; c++) {
                    // Define the style for this cell
                    let styles = this.wrap_text ? 'wrap ' : 'nowrap ';

                    // Highlight Cells
                    if (this.style.highlight.includes(c)) styles += 'greyHighlight '

                    // Text Cells
                    if (this.style.text.includes(c)) styles += 'remarks htLeft  '
                    else styles += 'htCenter '

                    // Add this style to the cell styles
                    this.cell_style[this.cell_style.length - 1][c] = styles;
                }
            }
        }

        // Adds a merge entry to be executed on HOT init
        add_merge(merge) {
            this.merge_cells.push(merge);
        }

        // Sets the initial date for the given true HOT row and col
        set_data(row, col, data) {
            this.data[row][col] = data;
        }

        // Converts a given view row to a handsontable row
        row_view_to_hot(view_row) {
            if (this.header_fields) return view_row + this.header_fields.length;
            else return -1;
        }

        // Converts a given handsontable row to a view row
        row_hot_to_view(hot_row) {
            if (this.header_fields) return hot_row - this.header_fields.length;
            else return -1;
        }

        // Returns the column information for the given source
        get_col(source) {
            let col_num = this.source_names[source];
            return { col: col_num, summable: this.summable[col_num], tooltip: this.tooltip[col_num], formatter: this.source_formatters[source] };
        }

        // Returns the source for the given true HOT col number
        get_source(col) {
            return this.source_idx[col];
        }

        // Gets the formatter for the given source column
        get_formatter(source) {
            return this.source_formatters[source];
        }

        // Gets the true HOT row and column for the given view row and source name
        get_entry_position(row, source) {
            return [this.row_view_to_hot(row), this.source_names[source]];
        }

        // Gets the true HOT row and column for the page total title
        get_page_total_position(source) {
            return [this.row_view_to_hot(this.total_source.page), this.source_names[source]];
        }

        // Gets the true HOT row and column for the forwarded total title
        get_forwarded_total_position(source) {
            return [this.row_view_to_hot(this.total_source.forward), this.source_names[source]];
        }

        // Gets the true HOT row and column for the grand total title
        get_grand_total_position(source) {
            return [this.row_view_to_hot(this.total_source.grand), this.source_names[source]];
        }

        // Gets the true HOT row and col for each of the total titles
        get_totals(source) {
            return {
                col: this.source_names[source],
                page_row: this.row_view_to_hot(this.total_source.page),
                forward_row: this.row_view_to_hot(this.total_source.forward),
                grand_row: this.row_view_to_hot(this.total_source.grand)
            }
        }

        // Returns the style for the given true HOT row and col
        get_cell_style(r, c) {
            return this.cell_style(r, c);
        }

        // Returns true if the given true HOT row is within the main view
        row_within_view(r) {
            return r >= this.header_fields.length && r < this.row_view_to_hot(this.num_rows);
        }

        // Returns true if the given true HOT row and col is editable
        cell_editable(r, c) {
            return this.row_within_view(r) && this.summable[c];
        }

        apply_style(hot) {
            // Go through each row and column of the cell style list and
            // apply the style to the handsontable cell
            for (let r = 0; r < this.cell_style.length; r++)
                for (let c = 0; c < this.cell_style[r].length; c++) {
                    // console.log(r, c, this.cell_style[r][c]);   
                    hot.setCellMeta(r, c, 'className', this.cell_style[r][c])
                }

            hot.render();
        }

        apply_style_changes(hot, style_changes){

            for (let change of style_changes) {
                let r = change[0]; let c = change[1]; let style = change[2];
                // console.log('Style change', r, c, this.cell_style[r][c] + style);
                hot.setCellMeta(r, c, 'className', this.cell_style[r][c] + style);
            }

            hot.render();
        }

    }

    return LogbookStyler;
})
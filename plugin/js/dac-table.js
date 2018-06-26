/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("dac-table", ["slycat-dialog", "dac-request-data", "dac-manage-selections",
	"jquery", "d3"], function(dialog, request, selections, $, d3)
{
	// public functions will be returned via the module variable
	var module = {};

	// actual meta data table
	var table_metadata = [];
	
	// slick grid and data views
	var data_view;
	var grid_view;
	
	// slick grid columns and rows
	var grid_columns = [];
	var grid_rows = [];
	
	// slick grid options
	var grid_options = {
    	enableColumnReorder: false,
    	multiSelect: false
  	};

	
	// populate slick grid's column metadata
	function make_column(id_index, column_index)
	{
		return {
			id : id_index,
			field : id_index,
			name : table_metadata["column-names"][column_index],
			sortable : true,
			toolTip : table_metadata["column-names"][column_index]
		};
	}
	
	// load grid data and set up colors for selections
	module.setup = function (metadata, data, include_columns)
	{

		// get number of rows and total available columns in data table
		var num_rows = data[0]["data"][0].length;
		var avail_cols = data[0]["data"].length;

	    // set number of columns to use
	    var num_cols = include_columns.length;

		// set up slick grid column names
		table_metadata = metadata[0];
		for (var i = 0; i != num_cols; i++) {
			grid_columns.push(make_column(i, include_columns[i]));
		}

		// produce new data table with correct columns
		table_data = [];
		for (var i = 0; i != num_cols; i++) {
		    table_data.push(data[0]["data"][include_columns[i]])
		}

		// produce a vector of sequential id for table rows and a zero vector
		var row_id = [];
		var zero_vec = [];
		for (var i = 0; i != num_rows; i++) {
			row_id.push(i);
			zero_vec.push(0);
		}

		// add two columns to data, unique id and selection mode
		table_data.push(row_id);
		table_data.push(zero_vec);
		grid_rows = d3.transpose(table_data);

		// set up slick grid
		data_view = new Slick.Data.DataView();
		grid_view = new Slick.Grid("#dac-datapoints-table", data_view,
							        grid_columns, grid_options);
				
		// keep track of shift or meta key
		grid_view.onClick.subscribe(one_row_selected);
				
		// set table data (second to last column is ids)
		data_view.setItems(grid_rows, num_cols);
				
		// set up row selection
		grid_view.setSelectionModel (new Slick.RowSelectionModel());
		//grid_view.onSelectedRowsChanged.subscribe(row_selected);
				
		// helpers for grid to respond to data_view changes
		data_view.onRowCountChanged.subscribe(change_rows);
		data_view.onRowsChanged.subscribe(change_cols);

  		// update meta data function to accommodate multiple selection classes
  		data_view.getItemMetadata = color_rows(data_view.getItemMetadata);
  				
  		// add sorting
  		grid_view.onSort.subscribe(col_sort);
  				
		// fit table into container
		module.resize();

	}

	// single row selection
	function one_row_selected(e, args) {

	    // pass along shift/meta key information
		selections.key_flip(e.shiftKey, e.metaKey);

		// convert row clicked to data table row
		var data_clicked = convert_row_ids([args.row])[0];

        // check if row is in the subset
        if (selections.in_subset(data_clicked)) {

            // make sure we are in a selection mode
            if (selections.sel_type() == 1 ||
                selections.sel_type() == 2) {

                // check if row is already selected
                // update selection and/or focus
                selections.update_sel_focus(data_clicked);

            // in zoom or subset mode, we can still do focus/de-focus
            } else if (selections.sel_type() == 0 ||
                       selections.sel_type() == 3 ) {

                selections.change_focus(data_clicked);

            }

        }
	}
	
	// slick grid row selected on click (for multiple rows)
	function row_selected (e, args)
	{
		
		// get rows selected
		var rows = grid_view.getSelectedRows();

		// convert to table ids
        var row_ids = convert_row_ids(rows);

		// add selections (unless in zoom mode)
		if (selections.sel_type() > 0) {
			selections.zero_sel();
			selections.update_sel(row_ids[0]);
		}	

		// fire selection change event
		var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
					                         active_sel: []} });
        document.body.dispatchEvent(selectionEvent);
		
	}

	// converts selected row id to table row id (in case table is sorted)
	function convert_row_ids(rows)
	{

		// change grid ids to data ids
		var row_ids = [];
		for (var i = 0; i < rows.length; i++) {
			var item = data_view.getItem(rows[i]);
			row_ids.push(item[item.length-2]);
		}

		return row_ids;

	}

	// slick grid change in rows
	function change_rows (e, args) 
	{
  		grid_view.updateRowCount();
  		grid_view.render();
	}
	
	// slick grid change in columns
	function change_cols (e, args) 
	{
  		grid_view.invalidateRows(args.rows);
  		grid_view.render();
  	}
  	
  	// override slick grid meta data method to color rows according to selection
  	function color_rows(old_metadata) {

  		return function(row) {
  			var item = this.getItem(row);
  			var meta = old_metadata(row) || {};
  			
  			if (item) {
  			
  				// make sure the "cssClasses" property exists
  				meta.cssClasses = meta.cssClasses || '';
  				
  				var num_cols = item.length;
  				
  				// set css class according to selection
  				if (item[num_cols-1] == 1) {
  					meta.cssClasses = 'selection-1';
  				} else if (item[num_cols-1] == 2) {
  					meta.cssClasses = 'selection-2';
  				} else if (item[num_cols-1] == 3) {
  				    meta.cssClasses = 'focus-selection';
  				} else if (item[num_cols-1] == 4) {
  				    meta.cssClasses = 'not-in-subset';
  				} else {
  					meta.cssClasses = 'no-selection';
  				}
  			}
  			
  			return meta;
  		}

  	}
  	
  	// slick grid column sort
  	function col_sort (e, args)
  	{
  		var comparer = function (a,b) {
  			return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
  		}
  		
  		data_view.sort(comparer, args.sortAsc);
  	}
  	
	// resize slick grid if container resizes
	module.resize = function()
	{
		// get size of container
		var width = $("#dac-datapoints-pane").width();
		var height = $("#dac-datapoints-pane").height();
		
		// set table size to size of container
		$("#dac-datapoints-table").width(width);
		$("#dac-datapoints-table").height(height);
		
		// re-draw table
		grid_view.resizeCanvas();
		
		// re-render header
		grid_view.setColumns(grid_view.getColumns())
	}
	
	// gets called to set selection type
	module.set_sel_type = function(new_sel_type)
	{
		curr_sel_type = new_sel_type;
	}
	
	// highlight rows for selections
	module.select_rows = function ()
	{

		// update selection indices
		var new_sel_1 = selections.sel_1();
		var new_sel_2 = selections.sel_2();
		var new_focus = selections.focus();
        var subset_mask = selections.get_subset();

		// generate vector of data view with new selections
		var sel_vec = [];
		var num_rows = data_view.getLength();
		for (var i = 0; i != num_rows; i++) {
			sel_vec.push(0);
		}

		// mark selection 1
		for (var i = 0; i != new_sel_1.length; i++) {
			sel_vec[new_sel_1[i]] = 1;
		}

		// mark selection 2
		for (var i = 0; i != new_sel_2.length; i++) {
			sel_vec[new_sel_2[i]] = 2;
		}

		// mark focus, if present
		if (new_focus != null) {
		    sel_vec[new_focus] = 3;
		}

		// mark if not in subset
		for (var i = 0; i < subset_mask.length; i++) {
		    if (!subset_mask[i]) {
		        sel_vec[i] = 4;
		    }
		}
		
		// temporarily turn off table rendering
		data_view.beginUpdate();
		
		// update last column of table with new selections
		// also get first selected row in grid view (not data view)
		for (var i = 0; i != num_rows; i++)
		{
			// get a row 
			var item = data_view.getItemById(i);
			var num_cols = item.length;
			
			// update selection info
			item[num_cols-1] = sel_vec[i];
			
			// put row back in table
			data_view.updateItem(i, item);
		}

		// turn table re-draw back on
		data_view.endUpdate();
				
	}
	
	// jumps to the first row in the provide selection
	module.jump_to = function (selection)
	{		
	
		// if selection is empty, nothing is done
		if (selection.length > 0)
		{
			var num_rows = data_view.getLength();
			var first_sel = num_rows - 1;
			for (var i = 0; i != num_rows; i++)
			{
				if (selection.indexOf(i) > -1) {
					first_sel = Math.min(first_sel, data_view.getRowById(i));
				}
			}
			
			// now scroll to first selected row
			grid_view.scrollRowIntoView(first_sel);
		}
		
	}
	
	return module;
	
});

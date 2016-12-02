// This script contains the code for managing the alpha buttons on the left
// hand side of the user interface for dial-a-cluster.  The .setup() function
// should be called first to initialize the private variables.
//
// S. Martin
// 2/12/2015

define ("dac-alpha-buttons", ["slycat-web-client", "jquery", "dac-request-data", 
	"dac-alpha-sliders", "dac-manage-selections", "dac-scatter-plot"], 
	function(client, $, request, alpha_sliders, selections, scatter_plot) {
	
	// return functions in module variables
	var module = {};
	
	// private variables
	var alpha_num = null;
	var alpha_clusters = null;
	
	// zero out all alpha sliders
	var zero_button_callback = function ()
	{
		// create zero array
		var zero_array = new Array(alpha_num);
		for (var i = 0; i != alpha_num; ++i) {
			zero_array[i] = 0.0;
		}
				
		// set alpha values to zero array
		alpha_sliders.set_alpha_values(zero_array);	
	}
	
	// put all alpha sliders to one
	var ones_button_callback = function ()
	{
		// create array of ones
		var ones_array = new Array(alpha_num);
		for (var i = 0; i != alpha_num; ++i) {
			ones_array[i] = 1.0;
		}
				
		// set alpha values to zero array
		alpha_sliders.set_alpha_values(ones_array);	
	}
	
	// cluster button modifies alpha values according to selections
	var cluster_button_callback = function ()
	{
		// get current color by column
		var color_by_col = scatter_plot.color_by_selection();
		
		// make sure it is not empty
		if (color_by_col == -1)
		{
			alert('Please select a color for the scatter plot.');
			return;
		}
		
		// set pre-computed alpha values for the selected column
		alpha_sliders.set_alpha_values(alpha_clusters[color_by_col]);	
	}
	
	module.setup = function ()
	{
	
		// determine number of alpha sliders
		$.when(request.get_table_metadata("dac-variables-meta")).then(
			function (variables_metadata)
			{
				// save number of sliders for later
				alpha_num = variables_metadata["row-count"];
			},
			function ()
			{
				alert ("Server failure: could not load variable meta-data.");
			}
		);
		
		// load up cluster alpha values
		$.when (request.get_array("dac-alpha-clusters", 0)).then(
			function (alpha_cluster_data)
			{	
				// input data into model
				alpha_clusters = alpha_cluster_data;
			},
			function ()
			{
				alert ("Server failure: could not load alpha cluster values.");
			}
		);
		
		// set up callback for zero all alpha button
		var zero_button = document.querySelector("#dac-alpha-zero-button");
		zero_button.addEventListener("click", zero_button_callback);
		
		// set up callback for all ones alpha button
		var ones_button = document.querySelector("#dac-alpha-one-button");
		ones_button.addEventListener("click", ones_button_callback);
		
		// set up callback for cluster button
		var cluster_button = document.querySelector("#dac-alpha-cluster-button");
		cluster_button.addEventListener("click", cluster_button_callback);
		
	}
	
	return module;
	
});
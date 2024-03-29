/*

Script Name: Create artboards
Author: William Dowling
Build Date: 16 November, 2015
Description: Create one artboard around each group in the document. Fix layer structure if necessary.
Build number: 2.0

Progress:

	Version 2.001
		26 September, 2016
		Added checkForPasteRemembersLayers function to identify and fix a production file which was
			created while "Paste Remembers Layers" was turned on.
	
	Version 2.002
		26 September, 2016
		Added autoClipCheck function to check for clipping masks automatically.
			Only check automatically if docRef.pathItems.length<5000
			Otherwise it takes way too long.
		version 2.002 failed bad. abandoning automatic fix of layers structure.. too slow.
		version 2.003 will retain automatic clip mask check, but if "paste remembers layers" caused an issue, the user will just get an alert.

	Version 2.003
		26 September, 2016
		removed functionality to automatically fix/merge layers.

	Version 2.004
		30 September, 2016
		Fixed issue with artboards not being fully deleted at runtime.

	Version 2.005
		11 October, 2016
		Altered artboard creation functions to create up to 100 artboards even if there are more than 100 shirt pieces.
			This allows the artist to run the script, then select all the art that didn't get an artboard and move that to a new document
				rather than trying to guess at the right number of pieces.

	Version 2.006
		11 October, 2016
		Fixed an issue wherein the first artboard was overwritten after it was created in the withClip function.

*/


function createArtboards ()
{

	////Set Script Global Variables////

	var valid = true;
	var scriptName = "create_artboards";

	function getUtilities ()
	{
		var utilNames = [ "Utilities_Container" ]; //array of util names
		var utilFiles = []; //array of util files
		//check for dev mode
		var devUtilitiesPreferenceFile = File( "~/Documents/script_preferences/dev_utilities.txt" );
		function readDevPref ( dp ) { dp.open( "r" ); var contents = dp.read() || ""; dp.close(); return contents; }
		if ( devUtilitiesPreferenceFile.exists && readDevPref( devUtilitiesPreferenceFile ).match( /true/i ) )
		{
			$.writeln( "///////\n////////\nUsing dev utilities\n///////\n////////" );
			var devUtilPath = "~/Desktop/automation/utilities/";
			utilFiles = [ devUtilPath + "Utilities_Container.js", devUtilPath + "Batch_Framework.js" ];
			return utilFiles;
		}

		var dataResourcePath = customizationPath + "Library/Scripts/Script_Resources/Data/";

		for ( var u = 0; u < utilNames.length; u++ )
		{
			var utilFile = new File( dataResourcePath + utilNames[ u ] + ".jsxbin" );
			if ( utilFile.exists )
			{
				utilFiles.push( utilFile );
			}

		}

		if ( !utilFiles.length )
		{
			alert( "Could not find utilities. Please ensure you're connected to the appropriate Customization drive." );
			return [];
		}


		return utilFiles;

	}
	var utilities = getUtilities();

	for ( var u = 0, len = utilities.length; u < len && valid; u++ )
	{
		eval( "#include \"" + utilities[ u ] + "\"" );
	}

	if ( !valid || !utilities.length ) return;

	DEV_LOGGING = user === "will.dowling";


	var docRef = app.activeDocument;
	var layers = docRef.layers;

	var tooManyAb = false;
	var abCount = 1;

	var invalidGroupItems = [];

	var clipMasks = autoClipMaskCheck();


	if ( valid )
	{
		var aB = docRef.artboards;
		var groupList = []; //array of all groupItems
		var finalSortList = []; // final array of vertically sorted sub-arrays
		var buffer = 145;
	}


	////Begin Function Commands////

	valid = checkForPasteRemembersLayers( layers );

	if ( valid )
	{
		var layer = checkBlankLayers();
	}
	else
	{
		alert( "Looks like \"Paste Remembers Layers\" was turned on when you copied your artwork.\nPlease merge your artwork onto a single layer and retry." );
		return;
	}


	if ( valid )
	{
		valid = deleteExistingArtboards();
	}
	else
	{
		alert( "Sorry.. something went wrong while finding the correct layer..." );
		return;
	}

	var groups = layer.groupItems;

	if ( valid )
	{
		if ( clipMasks )
		{
			withClip();
		}
		else
		{
			noClip();
		}
	}
	else
	{
		alert( "Sorry.. something went wrong while deleting the artboards.." );
		return;
	}

	if ( errorList.length )
	{
		sendErrors( errorList );
	}

	if ( invalidGroupItems.length )
	{
		docRef.selection = null;
		for ( var x = 0, len = invalidGroupItems.length; x < len; x++ )
		{
			invalidGroupItems[ x ].selected = true;
		}
	}

	aB.setActiveArtboardIndex( 0 );

	app.executeMenuCommand( "fitall" );


	/////////////////////////////
	////Begin Logic Container////
	/////////////////////////////

	//autoClipMaskCheck Function Description
	//automatically check document for existence of clipping masks
	//select all clipping masks with menu command
	//if length > 0 clipMasks = true;
	function autoClipMaskCheck ()
	{
		var localValid = false;

		docRef.selection = null;
		app.executeMenuCommand( "Clipping Masks menu item" );
		if ( docRef.selection.length > 0 )
		{
			localValid = true;
			docRef.selection = null;
		}


		return localValid
	}

	function checkForPasteRemembersLayers ( layers )
	{
		var tmp = false;
		for ( var a = 0; a < layers.length; a++ )
		{
			if ( layers[ a ].name.indexOf( "FD" ) > -1 )
			{
				tmp = true;
				break;
			}
		}

		if ( !tmp )
		{
			return true;
		}
		else
		{
			return false;
		}


	}

	function checkBlankLayers ()
	{
		var layersWithArt = [];
		if ( layers.length > 1 )
		{
			for ( var a = layers.length - 1; a > -1; a-- )
			{
				if ( layers[ a ].pageItems.length < 1 )
				{
					layers[ a ].remove();
				}
				else
				{
					layersWithArt.push( layers[ a ] );
				}
			}
			return layersWithArt.length ? layersWithArt[ 0 ] : layers[ 0 ];
			// if(layersWithArt.length>1){
			// 	alert("You have more than 1 layer with art on it. Please fix and retry.");
			// 	valid = false;
			// 	return;
			// }
			// else{
			// 	return layersWithArt[0];
			// }
		}
		else
		{
			return layers[ 0 ];
		}
	}

	function deleteExistingArtboards ()
	{
		// while (aB.length > 1){
		// for (r=1; r < aB.length; r++){
		// 	aB[r].remove();

		// 	} // end for loop R
		// } // end while loop

		//replacing above verbose and inefficient loop with the correct backwards loop
		for ( var r = aB.length - 1; r > 0; r-- )
		{
			aB[ r ].remove();
		}
		return true;
	}


	//function deprecated in version 2.002 in favor of automatic check
	//deprecated 26 September, 2016
	//
	//
	// function yesOrNoClipping(){
	// 	var clipOrNoClip = confirm("Are there clipping masks in your artwork?" + ('\n') + //
	// 	"If clipping masks exist, click 'YES'." + ('\n') + "Otherwise, click 'NO'.")

	// 	if(clipOrNoClip == true){
	// 		withClip();
	// 		return true;
	// 	}
	// 	else if(clipOrNoClip == false){
	// 		noClip();
	// 		return true;
	// 	}
	// }

	function noClip ()
	{
		//removing this logic because the artboard restriction has been lifted
		//with illustrator update
		// if(groups.length>100)
		// {
		// 	alert("You are trying to create too many artboards in the document. (" + groups.length + ")");
		// 	tooManyAb = true;
		// }
		organize();
		spliceExtraGroups();
		for ( var a = 0; a < finalSortList.length; a++ )
		{
			var currentRow = finalSortList[ a ];
			for ( var b = 0; b < currentRow.length; b++ )
			{

				if ( abCount < 1000 )
				{
					var currentGroup = currentRow[ b ];
					if ( currentGroup.height < 1 || currentGroup.width < 1 )
					{
						errorList.push( "Found an item that was too small to create an artboard. It should be selected." );
						invalidGroupItems.push( currentGroup );
						continue;
					}
					var newAb = aB.add( currentGroup.visibleBounds );
					newAb.name = currentGroup.name;
					abCount++;
					if ( abCount == 2 )
					{
						aB[ 0 ].remove();
					}
				}
				else
				{
					alert( "Maximum artboard limit reached." );
					return;
				}
			}
		}

		// for (a=0; a<finalSortList.length; a++){
		// 	var currentRow = finalSortList[a];
		// 	for (b=0; b< currentRow.length; b++){
		// 		var currentGroup = currentRow[b];
		// 		var newAb = aB.add(currentGroup.visibleBounds);
		// 		newAb.name = currentGroup.name;
		// 	}

		// }

		// if(aB.length > 1){
		// 	aB[0].remove();
		// }
	}

	function withClip ()
	{

		//removing this logic because the artboard restriction has been lifted
		//with illustrator update
		// if(groups.length>100)
		// {
		// 	alert("You are trying to create too many artboards in the document. (" + groups.length + ")"); 
		// 	tooManyAb = true;
		// }
		organize();
		spliceExtraGroups();
		var abIndex = 0;
		for ( a = 0; a < finalSortList.length; a++ )
		{
			var currentRow = finalSortList[ a ];
			for ( b = 0; b < currentRow.length; b++ )
			{

				if ( abCount < 1000 )
				{
					var currentGroup = currentRow[ b ];
					if ( abCount == 1 )
					{
						aB.setActiveArtboardIndex( 0 );
						docRef.selection = null;
						currentGroup.selected = true;
						docRef.fitArtboardToSelectedArt( 0 );
						aB[ 0 ].name = currentGroup.name;
						abCount++;
						abIndex++;
						continue;
					}

					docRef.selection = null;
					currentGroup.selected = true;
					var vB = currentGroup.visibleBounds;
					aB.add( vB );
					docRef.fitArtboardToSelectedArt( abIndex );
					aB[ abIndex ].name = currentGroup.name;
					abIndex++;
					abCount++;

				}
				else
				{
					alert( "Maximum artboard limit reached." );
					return;
				}
			}
		}
		// if(aB.length>0){
		// 	var r = aB.length-1;
		// 	aB[r].remove();
		// }
	}

	function organize ()
	{
		var currentRowCoord;
		var sortedGroupList = []; //array of subarrays sorted by visible bounds
		var temp = []; //temporary array for the current row of groupItems. 
		var tempSorted = []; // temporary array for current row of groupItems sorted by left coordinate



		//populate groupList

		for ( g = 0; g < groups.length; g++ )
		{
			groupList.push( groups[ g ] );
		}

		//set currentRowMarker and compare rest of groupList to top coordinate of visible bounds. push true results to temp array.

		while ( groupList.length > 0 )
		{
			var t = groupList.length - 1;
			temp = [];
			for ( c = 0; c < groupList.length; c++ )
			{
				if ( ( groupList[ t ].visibleBounds[ 1 ] - groupList[ t ].visibleBounds[ 3 ] ) > 22 )
				{
					var markerTop = groupList[ t ].visibleBounds[ 1 ];
					var markerBottom = groupList[ t ].visibleBounds[ 3 ];
					break;
				}
			}
			currentRowCoord = markerTop + ( ( markerBottom - markerTop ) / 2 );
			temp.push( groupList[ t ] );
			groupList.splice( t, 1 );
			for ( r = groupList.length - 1; r > -1; r-- )
			{
				var top = groupList[ r ].visibleBounds[ 1 ];
				var bottom = groupList[ r ].visibleBounds[ 3 ];
				if ( top + ( ( bottom - top ) / 2 ) + buffer > currentRowCoord && top + ( ( bottom - top ) / 2 ) - buffer < currentRowCoord )
				{
					temp.push( groupList[ r ] );
					groupList.splice( r, 1 );
				}
			}

			//sort temp array from left to right here:

			for ( s = temp.length; s > 0; s-- )
			{ // this loop pushes farthest left groupItem into sortedTemp array and splices it from temp array
				var placeholder = 0;
				var farthestLeft;
				var deleteIndex;
				for ( a = 0; a < temp.length; a++ )
				{ // this loop finds farthest left groupItem.
					if ( placeholder == 0 )
					{
						placeholder = temp[ a ].visibleBounds[ 0 ];
						farthestLeft = temp[ a ];
						deleteIndex = a;
					}
					else if ( temp[ a ].visibleBounds[ 0 ] < placeholder )
					{
						placeholder = temp[ a ].visibleBounds[ 0 ];
						farthestLeft = temp[ a ];
						deleteIndex = a;
					}
				}
				tempSorted.push( farthestLeft );
				temp.splice( deleteIndex, 1 );

			}

			if ( tempSorted.length > 0 )
			{
				sortedGroupList.push( tempSorted );
			}
			tempSorted = [];
		}

		//sort rows vertically here:

		for ( v = sortedGroupList.length - 1; v > -1; v-- )
		{
			var placeholder = 0;
			var topRow;
			var deleteIndex;
			for ( s = 0; s < sortedGroupList.length; s++ )
			{
				if ( placeholder == 0 )
				{
					placeholder = sortedGroupList[ s ][ 0 ].visibleBounds[ 1 ];
					topRow = sortedGroupList[ s ];
					deleteIndex = [ s ];
				}
				else if ( sortedGroupList[ s ][ 0 ].visibleBounds[ 1 ] > placeholder )
				{
					placeholder = sortedGroupList[ s ][ 0 ].visibleBounds[ 1 ];
					topRow = sortedGroupList[ s ];
					deleteIndex = s;
				}

			}
			finalSortList.push( topRow );
			sortedGroupList.splice( deleteIndex, 1 );
		}


	}

	function spliceExtraGroups ()
	{
		var L;
		var T;
		var R;
		var B;
		for ( r = 0; r < finalSortList.length; r++ )
		{
			var currentRow = finalSortList[ r ];
			for ( k = currentRow.length - 1; k > -1; k-- )
			{
				var MG = currentRow[ k ]; //measurement group
				L = MG.visibleBounds[ 0 ];
				T = MG.visibleBounds[ 1 ];
				R = MG.visibleBounds[ 2 ];
				B = MG.visibleBounds[ 3 ];
				for ( s = currentRow.length - 1; s > -1; s-- )
				{
					var CG = currentRow[ s ]; // compare group
					var CL = CG.visibleBounds[ 0 ];
					var CT = CG.visibleBounds[ 1 ];
					var CR = CG.visibleBounds[ 2 ];
					var CB = CG.visibleBounds[ 3 ];
					if ( CL > L && CT < T && CR < R && CB > B )
					{
						currentRow.splice( s, 1 );
					}
				}
			}
		}
	}

	function removeExtraArtboards ()
	{
		var docRef = app.activeDocument;
		var aB = docRef.artboards;
		var currentLeft;
		var currentTop;
		var currentRight;
		var currentBottom;
		var removeAB = [];

		for ( a = 0; a < aB.length; a++ )
		{
			var currentAB = aB[ a ];
			currentLeft = currentAB.artboardRect[ 0 ];
			currentTop = currentAB.artboardRect[ 1 ];
			currentRight = currentAB.artboardRect[ 2 ];
			currentBottom = currentAB.artboardRect[ 3 ];
			for ( ra = 1; ra < aB.length; ra++ )
			{
				var compareAB = aB[ ra ];
				var compareLeft = compareAB.artboardRect[ 0 ];
				var compareTop = compareAB.artboardRect[ 1 ];
				var compareRight = compareAB.artboardRect[ 2 ];
				var compareBottom = compareAB.artboardRect[ 3 ];
				if ( compareLeft > currentLeft && compareTop < currentTop && compareRight < currentRight && compareBottom > currentBottom )
				{
					removeAB.push( compareAB );
				}
			}
		}
		for ( r = removeAB.length - 1; r > -1; r-- )
		{
			removeAB[ r ].remove();
		}
	}

	/////////////////////////////	
	////End Logic Container////
	/////////////////////////////

}

createArtboards();


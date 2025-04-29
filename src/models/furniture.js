import { draw, makeBox, makeCylinder, makeCompound } from "replicad";
import { isPositive, validateAll } from "../validators.js";

// Static structure for technical drawing part identification
const componentDataStructure = [
  { id: "SB001", name: "Side Board + Tape" },
  { id: "BD001", name: "Bottom Divider + Tape" },
  { id: "HB1001", name: "Horizontal Board 1 + Tape" },
  { id: "HB2001", name: "Horizontal Board 2 + Tape" },
  { id: "VB001", name: "Vertical Board + Tape" },
  { id: "SS001", name: "Small Shelf + Tape" },
  { id: "SSTDH001", name: "Small Shelf (Top Div Holes) + Tape" },
  { id: "SSBDH001", name: "Small Shelf (Both Div Holes) + Tape" },
  { id: "SSWDH001", name: "Small Shelf (Bottom Div Holes) + Tape" }, // Added missing variation
  { id: "SSD001", name: "Small Shelf Divider + Tape" },
  { id: "BS001", name: "Big Shelf + Tape" },
  { id: "HB3001", name: "Horizontal Board 3 + Tape" },
  { id: "MD001", name: "Middle Door + Tapes" },
  { id: "SDL001", name: "Side Door Left + Tapes" },
  { id: "SDR001", name: "Side Door Right + Tapes" },
  // Note: Biscuits, pins, handles are not included as separate drawing parts currently
];


function createCloset({ width, depth, board_thickness }) {
  let closet = [];
  const technicalDrawingModels = {}; // Initialize object for drawing models
  const bottom_shelf_height = 50;
  const shelf_height = 30;
  const nr_biscuits_long = Math.floor(depth / 10);
  const nr_biscuits_middle = Math.floor((depth - board_thickness) / 10);
  const nr_biscuits_short = Math.floor(depth / 15);
  const between_long = (depth - nr_biscuits_long * 5) / (nr_biscuits_long + 1);
  const between_middle = (depth - board_thickness - nr_biscuits_middle * 5) / (nr_biscuits_middle + 1);
  const between_short = (2 * depth / 3 - nr_biscuits_short * 5) / (nr_biscuits_short + 1);

  const biscuit = draw([-2.4, 0.25])
    .bulgeArcTo([2.4, 0.25], -0.3)
    .tangentArcTo([2.4, -0.25])
    .bulgeArcTo([-2.4, -0.25], -0.3)
    .tangentArcTo([-2.4, 0.25])
    .close()
    .sketchOnPlane("XZ", -0.15)
    .extrude(0.3);


  const side_board_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_long; i++) {
    const biscuitInstance = biscuit.clone().translate(between_long + 2.5 + i * (5 + between_long), -width / 2 + board_thickness / 2, bottom_shelf_height);
    side_board_biscuits_top_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const side_board_biscuits_top = makeCompound(side_board_biscuits_top_array);

  const side_board_biscuits_side_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().rotate(90, [0, 0, 0], [1, 0, 0]).translate(between_middle + 2.5 + i * (5 + between_middle), -width / 2 + board_thickness, 3 * board_thickness / 2);
    side_board_biscuits_side_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const side_board_biscuits_side = makeCompound(side_board_biscuits_side_array);


  const side_board = makeBox([0, -width / 2, 0], [depth, -width / 2 + board_thickness, bottom_shelf_height])
    .cut(side_board_biscuits_top)
    .cut(side_board_biscuits_side);
  // Define tape before cloning for drawing model
  const side_board_tape = makeBox([depth, -width / 2, 0], [depth + 0.2, -width / 2 + board_thickness, bottom_shelf_height]);

  // --- Technical Drawing Model: Side Board + Tape ---
  const side_board_clone_for_drawing = side_board.clone();
  const side_board_tape_clone_for_drawing = side_board_tape.clone();
  technicalDrawingModels["SB001"] = makeCompound([side_board_clone_for_drawing, side_board_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  // Add original parts to the main assembly
  closet.push(side_board);
  closet.push(side_board.clone().mirror("XZ"));
  closet.push(side_board_tape);
  closet.push(side_board_tape.clone().mirror("XZ"));

  const bottom_divider_biscuits_bottom_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().translate(between_middle + 2.5 + i * (5 + between_middle), width / 6, 2 * board_thickness);
    bottom_divider_biscuits_bottom_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const bottom_divider_biscuits_bottom = makeCompound(bottom_divider_biscuits_bottom_array);

  const horizontal_board1 = makeBox([0, -width / 2 + board_thickness, board_thickness], [depth - board_thickness - 0.2, width / 2 - board_thickness, 2 * board_thickness])
    .cut(side_board_biscuits_side)
    .cut(side_board_biscuits_side)
    .cut(side_board_biscuits_side.mirror("XZ"))
    .cut(bottom_divider_biscuits_bottom)
    .cut(bottom_divider_biscuits_bottom.clone().mirror("XZ"));
  const horizontal_board1_tape = makeBox([depth - board_thickness - 0.2, -width / 2 + board_thickness, board_thickness], [depth - board_thickness, width / 2 - board_thickness, 2 * board_thickness]);

  // --- Technical Drawing Model: Horizontal Board 1 + Tape ---
  const horizontal_board1_clone_for_drawing = horizontal_board1.clone();
  const horizontal_board1_tape_clone_for_drawing = horizontal_board1_tape.clone();
  technicalDrawingModels["HB1001"] = makeCompound([horizontal_board1_clone_for_drawing, horizontal_board1_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  closet.push(horizontal_board1);
  closet.push(horizontal_board1_tape);

  const bottom_divider_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().translate(between_middle + 2.5 + i * (5 + between_middle), width / 6, bottom_shelf_height);
    bottom_divider_biscuits_top_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const bottom_divider_biscuits_top = makeCompound(bottom_divider_biscuits_top_array);

  const bottom_divider = makeBox([0, width / 6 - board_thickness / 2, 2 * board_thickness], [depth - board_thickness - 0.2, width / 6 + board_thickness / 2, bottom_shelf_height])
    .cut(bottom_divider_biscuits_bottom)
    .cut(bottom_divider_biscuits_top);
  const bottom_divider_tape = makeBox([depth - board_thickness - 0.2, width / 6 - board_thickness / 2, 2 * board_thickness], [depth - board_thickness, width / 6 + board_thickness / 2, bottom_shelf_height]);

  // --- Technical Drawing Model: Bottom Divider + Tape ---
  const bottom_divider_clone_for_drawing = bottom_divider.clone();
  const bottom_divider_tape_clone_for_drawing = bottom_divider_tape.clone();
  technicalDrawingModels["BD001"] = makeCompound([bottom_divider_clone_for_drawing, bottom_divider_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  closet.push(bottom_divider);
  closet.push(bottom_divider.clone().mirror("XZ"));
  closet.push(bottom_divider_tape);
  closet.push(bottom_divider_tape.clone().mirror("XZ"));

  const vertical_board_biscuits_bottom_array = [];
  for (let i = 0; i < nr_biscuits_short; i++) {
    const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i * (5 + between_short), width / 4, bottom_shelf_height + board_thickness);
    vertical_board_biscuits_bottom_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const vertical_board_biscuits_bottom = makeCompound(vertical_board_biscuits_bottom_array);

  const horizontal_board2 = makeBox([0, -width / 2, bottom_shelf_height], [depth, width / 2, bottom_shelf_height + board_thickness])
    .cut(side_board_biscuits_top)
    .cut(side_board_biscuits_top.mirror("XZ"))
    .cut(bottom_divider_biscuits_top)
    .cut(bottom_divider_biscuits_top.mirror("XZ"))
    .cut(vertical_board_biscuits_bottom)
    .cut(vertical_board_biscuits_bottom.clone().mirror("XZ"));
  const horizontal_board2_tape = makeBox([depth, -width / 2, bottom_shelf_height], [depth + 0.2, width / 2, bottom_shelf_height + board_thickness]);

  // --- Technical Drawing Model: Horizontal Board 2 + Tape ---
  const horizontal_board2_clone_for_drawing = horizontal_board2.clone();
  const horizontal_board2_tape_clone_for_drawing = horizontal_board2_tape.clone();
  technicalDrawingModels["HB2001"] = makeCompound([horizontal_board2_clone_for_drawing, horizontal_board2_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  closet.push(horizontal_board2);
  closet.push(horizontal_board2_tape);

  const vertical_board_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_short; i++) {
    const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i * (5 + between_short), width / 4, bottom_shelf_height + 6 * (board_thickness + shelf_height));
    vertical_board_biscuits_top_array.push(biscuitInstance);
    closet.push(biscuitInstance.clone());
    closet.push(biscuitInstance.clone().mirror("XZ"));
  }
  const vertical_board_biscuits_top = makeCompound(vertical_board_biscuits_top_array);

  const vertical_board_biscuits_side_array = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < nr_biscuits_short; j++) {
      const biscuitInstance = biscuit.clone().rotate(90, [0, 0, 0], [1, 0, 0]).translate(between_short + 2.5 + j * (5 + between_short), width/4 - board_thickness / 2, bottom_shelf_height + 2.5 * board_thickness + 2 * shelf_height + i*(shelf_height + board_thickness));
      vertical_board_biscuits_side_array.push(biscuitInstance);
      closet.push(biscuitInstance.clone());
      closet.push(biscuitInstance.clone().mirror("XZ"));
    }
  }
  const vertical_board_biscuits_side = makeCompound(vertical_board_biscuits_side_array);
  
  const pin = makeCylinder(0.4, 3, [between_short/2, width/4+board_thickness, bottom_shelf_height + shelf_height + 1.5*board_thickness], [0, -1, 0]);
  const vertical_board_pins_array = [];
	for (let i=0; i<5; i++) {
		for (let j=0; j<nr_biscuits_short+1; j++) {
			const pinInstance = pin.clone().translate(j*(between_short+5), 0, i*(shelf_height+board_thickness));
			vertical_board_pins_array.push(pinInstance.clone());
			closet.push(pinInstance.clone());
			closet.push(pinInstance.clone().mirror("XZ"));
		}
	}
  const vertical_board_pins = makeCompound(vertical_board_pins_array);

  const vertical_board = makeBox([0, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)])
    .cut(vertical_board_biscuits_bottom)
    .cut(vertical_board_biscuits_top)
    .cut(vertical_board_biscuits_side)
    .cut(vertical_board_pins.clone());
  const vertical_board_tape = makeBox([2 * depth / 3, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3 + 0.2, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)]);

  // --- Technical Drawing Model: Vertical Board + Tape ---
  const vertical_board_clone_for_drawing = vertical_board.clone();
  const vertical_board_tape_clone_for_drawing = vertical_board_tape.clone();
  technicalDrawingModels["VB001"] = makeCompound([vertical_board_clone_for_drawing, vertical_board_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  closet.push(vertical_board);
  closet.push(vertical_board.clone().mirror("XZ"));
  closet.push(vertical_board_tape);
  closet.push(vertical_board_tape.clone().mirror("XZ"));
	
	const small_shelf_pins_array = [];
	for (let i=0; i<nr_biscuits_short+1; i++) {
		const pinInstance = pin.clone().translateX(i*(between_short+5));
		small_shelf_pins_array.push(pinInstance);
	}
	const small_shelf_pins = makeCompound(small_shelf_pins_array);
	const small_shelf = makeBox([0, width/4+board_thickness/2, bottom_shelf_height+board_thickness+shelf_height], [2*depth/3, width/2, bottom_shelf_height+2*board_thickness+shelf_height]).cut(small_shelf_pins.clone());
	// Define tape once, before variations and drawing models
	const small_shelf_tape = makeBox([2*depth/3, width/4+board_thickness/2, bottom_shelf_height+board_thickness+shelf_height], [2*depth/3+0.2, width/2, bottom_shelf_height+2*board_thickness+shelf_height]);

	// --- Technical Drawing Model: Small Shelf + Tape (Base) ---
	const small_shelf_clone_for_drawing = small_shelf.clone();
	const small_shelf_tape_clone_for_drawing = small_shelf_tape.clone(); // Use the base tape position relative to the base shelf
	technicalDrawingModels["SS001"] = makeCompound([small_shelf_clone_for_drawing, small_shelf_tape_clone_for_drawing]);
	// --- End Technical Drawing Model ---

	// Add base small shelf variations to assembly (tape added later in loop)
	closet.push(small_shelf);
	closet.push(small_shelf.clone().mirror("XZ"));
	closet.push(small_shelf.clone().translateZ(shelf_height+board_thickness));
	closet.push(small_shelf.clone().translateZ(shelf_height+board_thickness).mirror("XZ"));
	
	const small_shelf_bottom_divider_bottom_biscuits_array = [];
	for (let i=0; i<nr_biscuits_short; i++) {
		const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i*(between_short+5), 3*width/8-board_thickness/4, bottom_shelf_height + 3*shelf_height + 4*board_thickness);
		small_shelf_bottom_divider_bottom_biscuits_array.push(biscuitInstance);
		closet.push(biscuitInstance.clone());
		closet.push(biscuitInstance.clone().mirror("XZ"));
	}
	const small_shelf_bottom_divider_bottom_biscuits = makeCompound(small_shelf_bottom_divider_bottom_biscuits_array);

	const small_shelf_bottom_divider_top_biscuits_array = [];
	for (let i=0; i<nr_biscuits_short; i++) {
		const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i*(between_short+5), 3*width/8-board_thickness/4, bottom_shelf_height + 4*(shelf_height + board_thickness));
		small_shelf_bottom_divider_top_biscuits_array.push(biscuitInstance);
		closet.push(biscuitInstance.clone());
		closet.push(biscuitInstance.clone().mirror("XZ"));
	}
	const small_shelf_bottom_divider_top_biscuits = makeCompound(small_shelf_bottom_divider_top_biscuits_array);

	const small_shelf_top_divider_bottom_biscuits_array = [];
	for (let i=0; i<nr_biscuits_short; i++) {
		const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i*(between_short+5), 3*width/8-board_thickness/4, bottom_shelf_height + 4*shelf_height + 5*board_thickness);
		small_shelf_top_divider_bottom_biscuits_array.push(biscuitInstance);
		closet.push(biscuitInstance.clone());
		closet.push(biscuitInstance.clone().mirror("XZ"));
	}
	const small_shelf_top_divider_bottom_biscuits = makeCompound(small_shelf_top_divider_bottom_biscuits_array);

	const small_shelf_top_divider_top_biscuits_array = [];
	for (let i=0; i<nr_biscuits_short; i++) {
		const biscuitInstance = biscuit.clone().translate(between_short + 2.5 + i*(between_short+5), 3*width/8-board_thickness/4, bottom_shelf_height + 5*(shelf_height + board_thickness));
		small_shelf_top_divider_top_biscuits_array.push(biscuitInstance);
		closet.push(biscuitInstance.clone());
		closet.push(biscuitInstance.clone().mirror("XZ"));
	}
	const small_shelf_top_divider_top_biscuits = makeCompound(small_shelf_top_divider_top_biscuits_array);

	const small_shelf_w_top_div_holes = small_shelf.clone().translateZ(2*(shelf_height+board_thickness)).cut(small_shelf_bottom_divider_bottom_biscuits);
	// --- Technical Drawing Model: Small Shelf (Top Div Holes) + Tape ---
	const small_shelf_w_top_div_holes_clone = small_shelf_w_top_div_holes.clone();
	const small_shelf_tape_clone_top_div = small_shelf_tape.clone().translateZ(2*(shelf_height+board_thickness)); // Translate tape to match shelf
	technicalDrawingModels["SSTDH001"] = makeCompound([small_shelf_w_top_div_holes_clone, small_shelf_tape_clone_top_div]);
	// --- End Technical Drawing Model ---
	closet.push(small_shelf_w_top_div_holes);
	closet.push(small_shelf_w_top_div_holes.clone().mirror("XZ"));

	const small_shelf_w_both_div_holes = small_shelf.clone().translateZ(3*(shelf_height+board_thickness)).cut(small_shelf_bottom_divider_top_biscuits).cut(small_shelf_top_divider_bottom_biscuits);
	// --- Technical Drawing Model: Small Shelf (Both Div Holes) + Tape ---
	const small_shelf_w_both_div_holes_clone = small_shelf_w_both_div_holes.clone();
	const small_shelf_tape_clone_both_div = small_shelf_tape.clone().translateZ(3*(shelf_height+board_thickness)); // Translate tape to match shelf
	technicalDrawingModels["SSBDH001"] = makeCompound([small_shelf_w_both_div_holes_clone, small_shelf_tape_clone_both_div]);
	// --- End Technical Drawing Model ---
	closet.push(small_shelf_w_both_div_holes);
	closet.push(small_shelf_w_both_div_holes.clone().mirror("XZ"));

	const small_shelf_w_bottom_div_holes = small_shelf.clone().translateZ(4*(shelf_height+board_thickness)).cut(small_shelf_top_divider_top_biscuits);
	// --- Technical Drawing Model: Small Shelf (Bottom Div Holes) + Tape ---
	const small_shelf_w_bottom_div_holes_clone = small_shelf_w_bottom_div_holes.clone();
	const small_shelf_tape_clone_bottom_div = small_shelf_tape.clone().translateZ(4*(shelf_height+board_thickness)); // Translate tape to match shelf
	technicalDrawingModels["SSWDH001"] = makeCompound([small_shelf_w_bottom_div_holes_clone, small_shelf_tape_clone_bottom_div]);
	// --- End Technical Drawing Model ---
	closet.push(small_shelf_w_bottom_div_holes);
	closet.push(small_shelf_w_bottom_div_holes.clone().mirror("XZ"));

	// small_shelf_tape is already defined earlier
	// Loop to add tape instances to the main assembly
	for (let i = 0; i<5; i++) {
		closet.push(small_shelf_tape.clone().translateZ(i*(board_thickness+shelf_height)));
		closet.push(small_shelf_tape.clone().translateZ(i*(board_thickness+shelf_height)).mirror("XZ"));
	}

	const small_shelf_divider = makeBox([0, 3*width/8-3*board_thickness/4, bottom_shelf_height+3*shelf_height+4*board_thickness], [2*depth/3, 3*width/8+board_thickness/4, bottom_shelf_height+4*(shelf_height+board_thickness)]).cut(small_shelf_bottom_divider_bottom_biscuits).cut(small_shelf_bottom_divider_top_biscuits);
	closet.push(small_shelf_divider);
	closet.push(small_shelf_divider.clone().mirror("XZ"));
	closet.push(small_shelf_divider.clone().translateZ(shelf_height+board_thickness));
	closet.push(small_shelf_divider.clone().translateZ(shelf_height+board_thickness).mirror("XZ"));

	const small_shelf_divider_tape = makeBox([2*depth/3, 3*width/8-3*board_thickness/4, bottom_shelf_height+3*shelf_height+4*board_thickness], [2*depth/3+0.2, 3*width/8+board_thickness/4, bottom_shelf_height+4*(shelf_height+board_thickness)]);
	// --- Technical Drawing Model: Small Shelf Divider + Tape ---
	// Note: Using the first instance before translation/mirroring
	const small_shelf_divider_clone_for_drawing = small_shelf_divider.clone();
	const small_shelf_divider_tape_clone_for_drawing = small_shelf_divider_tape.clone();
	technicalDrawingModels["SSD001"] = makeCompound([small_shelf_divider_clone_for_drawing, small_shelf_divider_tape_clone_for_drawing]);
	// --- End Technical Drawing Model ---

	closet.push(small_shelf_divider_tape);
	closet.push(small_shelf_divider_tape.clone().mirror("XZ"));
	closet.push(small_shelf_divider_tape.clone().translateZ(board_thickness+shelf_height));
	closet.push(small_shelf_divider_tape.clone().translateZ(board_thickness+shelf_height).mirror("XZ"));

  const big_shelf_biscuits_array = [];
  for (let i=0; i<nr_biscuits_short; i++) {
    const biscuitInstance = biscuit.clone().rotate(90, [0, 0, 0], [1, 0, 0]).translate(between_short + 2.5 + i * (5 + between_short), width/4 - board_thickness/2, bottom_shelf_height + 2.5 * board_thickness + 2 * shelf_height);
    big_shelf_biscuits_array.push(biscuitInstance);
  }
  const big_shelf_biscuits = makeCompound(big_shelf_biscuits_array);
  const big_shelf = makeBox([0, -width/4+board_thickness/2, bottom_shelf_height + 2*(shelf_height+board_thickness)], [2*depth/3, width/4-board_thickness/2, bottom_shelf_height + 2*shelf_height + 3*board_thickness]).cut(big_shelf_biscuits);
  const big_shelf_tape = makeBox([2*depth/3, -width/4+board_thickness/2, bottom_shelf_height + 2*(shelf_height+board_thickness)], [2*depth/3+0.2, width/4 - board_thickness/2, bottom_shelf_height + 2*shelf_height + 3*board_thickness]);

  // --- Technical Drawing Model: Big Shelf + Tape ---
  // Note: Using the first instance before translation
  const big_shelf_clone_for_drawing = big_shelf.clone();
  const big_shelf_tape_clone_for_drawing = big_shelf_tape.clone();
  technicalDrawingModels["BS001"] = makeCompound([big_shelf_clone_for_drawing, big_shelf_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  for (let i=0; i<4; i++) {
    closet.push(big_shelf.clone().translateZ(i*(shelf_height + board_thickness)));
    closet.push(big_shelf_tape.clone().translateZ(i*(shelf_height+board_thickness)));
  }

  const horizontal_board3 = makeBox([0, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height])
    .cut(vertical_board_biscuits_top)
    .cut(vertical_board_biscuits_top.mirror("XZ"));
  const horizontal_board3_tape = makeBox([depth, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth + 0.2, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height]);

  // --- Technical Drawing Model: Horizontal Board 3 + Tape ---
  const horizontal_board3_clone_for_drawing = horizontal_board3.clone();
  const horizontal_board3_tape_clone_for_drawing = horizontal_board3_tape.clone();
  technicalDrawingModels["HB3001"] = makeCompound([horizontal_board3_clone_for_drawing, horizontal_board3_tape_clone_for_drawing]);
  // --- End Technical Drawing Model ---

  closet.push(horizontal_board3);
  closet.push(horizontal_board3_tape);

	const bolt_hole = makeCylinder(0.3, board_thickness, [depth, -width/6-board_thickness, bottom_shelf_height-board_thickness], [-1, 0, 0]);

	const hinge_hole = makeCylinder(1.5, board_thickness/2, [depth-board_thickness, -width/2 + 2*board_thickness, bottom_shelf_height - 2*board_thickness], [1, 0, 0]);

  const side_door_left = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, board_thickness], [depth, -width / 6 - 0.3, bottom_shelf_height - 0.4])
		.cut(bolt_hole)
		.cut(hinge_hole)
		.cut(hinge_hole.clone().translateZ(-bottom_shelf_height + 6*board_thickness));
  closet.push(side_door_left);
	const side_door_right = side_door_left.clone().mirror("XZ");
  // Define side door tapes before creating drawing models
  const side_door_tape_inner = makeBox([depth - board_thickness, -width / 6 - 0.3, board_thickness], [depth, -width / 6 - 0.1, bottom_shelf_height - 0.4]);
  const side_door_tape_outer = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.2, board_thickness], [depth, -width / 2 + board_thickness + 0.4, bottom_shelf_height - 0.4]);
  const side_door_tape_top = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, bottom_shelf_height - 0.4], [depth, -width / 6 - 0.3, bottom_shelf_height - 0.2]);
  const side_door_tape_bottom = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, board_thickness], [depth, -width / 6 - 0.3, board_thickness + 0.2]);

  // --- Technical Drawing Model: Side Door Left + Tapes ---
  const side_door_left_clone_for_drawing = side_door_left.clone();
  const side_door_tape_inner_clone = side_door_tape_inner.clone();
  const side_door_tape_outer_clone = side_door_tape_outer.clone();
  const side_door_tape_top_clone = side_door_tape_top.clone();
  const side_door_tape_bottom_clone = side_door_tape_bottom.clone();
  const side_door_left_compound = makeCompound([
    side_door_left_clone_for_drawing,
    side_door_tape_inner_clone,
    side_door_tape_outer_clone,
    side_door_tape_top_clone,
    side_door_tape_bottom_clone
  ]);
  technicalDrawingModels["SDL001"] = side_door_left_compound;
  // --- End Technical Drawing Model ---

  // --- Technical Drawing Model: Side Door Right + Tapes ---
  // Mirror the left door compound to create the right door drawing model
  technicalDrawingModels["SDR001"] = side_door_left_compound.clone().mirror("XZ");
  // --- End Technical Drawing Model ---

  closet.push(side_door_right);
  // Add side door tapes to assembly later

  const middle_door = makeBox([depth - board_thickness, -width / 6 + 0.3, board_thickness], [depth, width / 6 - 0.3, bottom_shelf_height - 0.4])
		.cut(bolt_hole.clone().translateY(2*board_thickness).mirror("XZ"))
		.cut(hinge_hole.clone().translateY(width/3))
		.cut(hinge_hole.clone().translate(0, width/3, -bottom_shelf_height + 6*board_thickness));
  // Define middle door tapes before creating drawing model or adding to closet
  const middle_door_tape_left = makeBox([depth - board_thickness, -width / 6 + 0.1, board_thickness], [depth, -width / 6 + 0.3, bottom_shelf_height - 0.4]);
  const middle_door_tape_right = makeBox([depth - board_thickness, width / 6 - 0.3, board_thickness], [depth, width / 6 - 0.1, bottom_shelf_height - 0.4]);
  const middle_door_tape_top = makeBox([depth - board_thickness, -width / 6 + 0.3, bottom_shelf_height - 0.4], [depth, width / 6 - 0.3, bottom_shelf_height - 0.2]);
  const middle_door_tape_bottom = makeBox([depth - board_thickness, -width / 6 + 0.3, board_thickness], [depth, width / 6 - 0.3, board_thickness + 0.2]);

  // --- Technical Drawing Model: Middle Door + Tapes ---
  const middle_door_clone_for_drawing = middle_door.clone();
  const middle_door_tape_left_clone = middle_door_tape_left.clone();
  const middle_door_tape_right_clone = middle_door_tape_right.clone();
  const middle_door_tape_top_clone = middle_door_tape_top.clone();
  const middle_door_tape_bottom_clone = middle_door_tape_bottom.clone();
  technicalDrawingModels["MD001"] = makeCompound([
    middle_door_clone_for_drawing,
    middle_door_tape_left_clone,
    middle_door_tape_right_clone,
    middle_door_tape_top_clone,
    middle_door_tape_bottom_clone
  ]);
  // --- End Technical Drawing Model ---

  closet.push(middle_door);
  // Add middle door tapes to assembly now
  closet.push(middle_door_tape_left);
  closet.push(middle_door_tape_right);
  closet.push(middle_door_tape_top);
  closet.push(middle_door_tape_bottom);

  // Add side door tapes (original and mirrored) to the main assembly
  closet.push(side_door_tape_inner);
  closet.push(side_door_tape_outer);
  closet.push(side_door_tape_top);
  closet.push(side_door_tape_bottom);
  closet.push(side_door_tape_inner.clone().mirror("XZ"));
  closet.push(side_door_tape_outer.clone().mirror("XZ"));
  closet.push(side_door_tape_top.clone().mirror("XZ"));
  closet.push(side_door_tape_bottom.clone().mirror("XZ"));

  // Middle door tapes were already defined and added to the closet array earlier
  // Remove the redundant declarations here

  const handle = makeCylinder(0.5, 2, [depth, width/6+board_thickness, bottom_shelf_height-board_thickness], [1, 0, 0])
                 .fuse(makeCylinder(1, 1, [depth+2, width/6+board_thickness, bottom_shelf_height-board_thickness], [1, 0, 0]));
  closet.push(handle);
  closet.push(handle.clone().mirror("XZ"));
  closet.push(handle.clone().translateY(-2*board_thickness));

  // Return the main model and the models for technical drawings
  return {
    main: makeCompound(closet),
    technicalDrawingModels: technicalDrawingModels,
    // componentData could be added here if needed, similar to staircase,
    // but the current worker seems to rely on componentDataStructure
    // passed via the model definition below.
  };
}

export const closetModel = {
  name: "Closet",
  create: createCloset,
  params: [
    { name: "width", defaultValue: 200, description: "Overall width of the closet" },
    { name: "depth", defaultValue: 50, description: "Overall depth of the closet" },
    { name: "board_thickness", defaultValue: 3, description: "Thickness of the boards used" }
  ],
  validators: [
    validateAll(isPositive, ["width", "depth", "board_thickness"])
  ],
  hasExplosion: false,
  hasBoM: true,
  hasTechnicalDrawingParts: true, // Add flag
  componentDataStructure: componentDataStructure // Expose static structure
};
import { draw, makeBox, makeCylinder, makeCompound } from "replicad";
import { isPositive, validateAll } from "../validators.js";

function createCloset({ width, depth, board_thickness }) {
  let closet = [];
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
  closet.push(side_board);
  closet.push(side_board.clone().mirror("XZ"));

  const side_board_tape = makeBox([depth, -width / 2, 0], [depth + 0.2, -width / 2 + board_thickness, bottom_shelf_height]);
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
    .cut(side_board_biscuits_side.mirror("XZ"))
    .cut(bottom_divider_biscuits_bottom)
    .cut(bottom_divider_biscuits_bottom.clone().mirror("XZ"));
  closet.push(horizontal_board1);

  const horizontal_board1_tape = makeBox([depth - board_thickness - 0.2, -width / 2 + board_thickness, board_thickness], [depth - board_thickness, width / 2 - board_thickness, 2 * board_thickness]);
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
  closet.push(bottom_divider);
  closet.push(bottom_divider.clone().mirror("XZ"));

  const bottom_divider_tape = makeBox([depth - board_thickness - 0.2, width / 6 - board_thickness / 2, 2 * board_thickness], [depth - board_thickness, width / 6 + board_thickness / 2, bottom_shelf_height]);
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
  closet.push(horizontal_board2);

  const horizontal_board2_tape = makeBox([depth, -width / 2, bottom_shelf_height], [depth + 0.2, width / 2, bottom_shelf_height + board_thickness]);
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
  
  const pin = makeCylinder(0.4, 3, [between_short/2, -width/4, bottom_shelf_height + shelf_height + 1.5*board_thickness], [0, -1, 0]);
  const vertical_board_pins_array = [];
	for (let i=0; i<5; i++) {
		for (let j=0; j<nr_biscuits_short+1; j++) {
			const pinInstance = pin.clone().translate(j*(between_short+5), 0, i*(shelf_height+board_thickness));
			vertical_board_pins_array.push(pinInstance);
			closet.push(pinInstance.clone());
			closet.push(pinInstance.clone().mirror("XZ"));
		}
	}
  const vertical_board_pins = makeCompound(vertical_board_pins_array);

  const vertical_board = makeBox([0, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)])
    .cut(vertical_board_biscuits_bottom)
    .cut(vertical_board_biscuits_top)
    .cut(vertical_board_biscuits_side)
    .cut(vertical_board_pins);
  closet.push(vertical_board);
  closet.push(vertical_board.clone().mirror("XZ"));

  const vertical_board_tape = makeBox([2 * depth / 3, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3 + 0.2, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)]);
  closet.push(vertical_board_tape);
  closet.push(vertical_board_tape.clone().mirror("XZ"));
	
	const small_shelf_pins_array = [];
	for (let i=0; i<nr_biscuits_short+1; i++) {
		const pinInstance = pin.clone().translateX(i*(between_short+5));
		small_shelf_pins_array.push(pinInstance);
	}
	const small_shelf_pins = makeCompound(small_shelf_pins_array);
	const small_shelf = makeBox([0, width/4+board_thickness/2, bottom_shelf_height+board_thickness+shelf_height], [2*depth/3, width/2, bottom_shelf_height+2*board_thickness+shelf_height]).cut(small_shelf_pins);
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
	closet.push(small_shelf_w_top_div_holes);
	closet.push(small_shelf_w_top_div_holes.clone().mirror("XZ"));

	const small_shelf_w_both_div_holes = small_shelf.clone().translateZ(3*(shelf_height+board_thickness)).cut(small_shelf_bottom_divider_top_biscuits).cut(small_shelf_top_divider_bottom_biscuits);
	closet.push(small_shelf_w_both_div_holes);
	closet.push(small_shelf_w_both_div_holes.clone().mirror("XZ"));

	const small_shelf_w_bottom_div_holes = small_shelf.clone().translateZ(4*(shelf_height+board_thickness)).cut(small_shelf_top_divider_top_biscuits);
	closet.push(small_shelf_w_bottom_div_holes);
	closet.push(small_shelf_w_bottom_div_holes.clone().mirror("XZ"));

	const small_shelf_tape = makeBox([2*depth/3, width/4+board_thickness/2, bottom_shelf_height+board_thickness+shelf_height], [2*depth/3+0.2, width/2, bottom_shelf_height+2*board_thickness+shelf_height]);
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
  for (let i=0; i<4; i++) {
    closet.push(big_shelf.clone().translateZ(i*(shelf_height + board_thickness)));
    closet.push(big_shelf_tape.clone().translateZ(i*(shelf_height+board_thickness)));
  }

  const horizontal_board3 = makeBox([0, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height])
    .cut(vertical_board_biscuits_top)
    .cut(vertical_board_biscuits_top.mirror("XZ"));
  closet.push(horizontal_board3);

  const horizontal_board3_tape = makeBox([depth, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth + 0.2, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height]);
  closet.push(horizontal_board3_tape);

	const bolt_hole = makeCylinder(0.3, board_thickness, [depth, -width/6-board_thickness, bottom_shelf_height-board_thickness], [-1, 0, 0]);

	const hinge_hole = makeCylinder(1.5, board_thickness/2, [depth-board_thickness, -width/2 + 2*board_thickness, bottom_shelf_height - 2*board_thickness], [1, 0, 0]);

  const side_door_left = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, board_thickness], [depth, -width / 6 - 0.3, bottom_shelf_height - 0.4])
		.cut(bolt_hole)
		.cut(hinge_hole)
		.cut(hinge_hole.clone().translateZ(-bottom_shelf_height + 6*board_thickness));
  closet.push(side_door_left);
	const side_door_right = side_door_left.clone().mirror("XZ");
  closet.push(side_door_right);

  const middle_door = makeBox([depth - board_thickness, -width / 6 + 0.3, board_thickness], [depth, width / 6 - 0.3, bottom_shelf_height - 0.4])
		.cut(bolt_hole.clone().translateY(2*board_thickness).mirror("XZ"))
		.cut(hinge_hole.clone().translateY(width/3))
		.cut(hinge_hole.clone().translate(0, width/3, -bottom_shelf_height + 6*board_thickness));
  closet.push(middle_door);

  const side_door_tape_inner = makeBox([depth - board_thickness, -width / 6 - 0.3, board_thickness], [depth, -width / 6 - 0.1, bottom_shelf_height - 0.4]);
  const side_door_tape_outer = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.2, board_thickness], [depth, -width / 2 + board_thickness + 0.4, bottom_shelf_height - 0.4]);
  const side_door_tape_top = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, bottom_shelf_height - 0.4], [depth, -width / 6 - 0.3, bottom_shelf_height - 0.2]);
  const side_door_tape_bottom = makeBox([depth - board_thickness, -width / 2 + board_thickness + 0.4, board_thickness], [depth, -width / 6 - 0.3, board_thickness + 0.2]);
  closet.push(side_door_tape_inner);
  closet.push(side_door_tape_outer);
  closet.push(side_door_tape_top);
  closet.push(side_door_tape_bottom);
  closet.push(side_door_tape_inner.clone().mirror("XZ"));
  closet.push(side_door_tape_outer.clone().mirror("XZ"));
  closet.push(side_door_tape_top.clone().mirror("XZ"));
  closet.push(side_door_tape_bottom.clone().mirror("XZ"));

  const middle_door_tape_left = makeBox([depth - board_thickness, -width / 6 + 0.1, board_thickness], [depth, -width / 6 + 0.3, bottom_shelf_height - 0.4]);
  const middle_door_tape_right = makeBox([depth - board_thickness, width / 6 - 0.3, board_thickness], [depth, width / 6 - 0.1, bottom_shelf_height - 0.4]);
  const middle_door_tape_top = makeBox([depth - board_thickness, -width / 6 + 0.3, bottom_shelf_height - 0.4], [depth, width / 6 - 0.3, bottom_shelf_height - 0.2]);
  const middle_door_tape_bottom = makeBox([depth - board_thickness, -width / 6 + 0.3, board_thickness], [depth, width / 6 - 0.3, board_thickness + 0.2]);
  closet.push(middle_door_tape_left);
  closet.push(middle_door_tape_right);
  closet.push(middle_door_tape_top);
  closet.push(middle_door_tape_bottom);

  const handle = makeCylinder(0.5, 2, [depth, width/6+board_thickness, bottom_shelf_height-board_thickness], [1, 0, 0])
                 .fuse(makeCylinder(1, 1, [depth+2, width/6+board_thickness, bottom_shelf_height-board_thickness], [1, 0, 0]));
  closet.push(handle);
  closet.push(handle.clone().mirror("XZ"));
  closet.push(handle.clone().translateY(-2*board_thickness));

  return makeCompound(closet);
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
  hasBoM: true
};
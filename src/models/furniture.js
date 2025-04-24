import { draw, makeBox, makeCylinder, makeCompound } from "replicad";
import { isPositive, validateAll } from "../validators.js";

// Function to create the closet geometry
function createCloset({ width, depth, board_thickness }) {
  let closet = [];
  const bottom_shelf_height = 500;
  const shelf_height = 300;
  const nr_biscuits_long = Math.floor(depth / 100);
  const nr_biscuits_middle = Math.floor((depth - board_thickness) / 100);
  const nr_biscuits_short = Math.floor(depth / 150);
  const between_long = (depth - nr_biscuits_long * 50) / (nr_biscuits_long + 1);
  const between_middle = (depth - board_thickness - nr_biscuits_middle * 50) / (nr_biscuits_middle + 1);
  const between_short = (2 * depth / 3 - nr_biscuits_short * 50) / (nr_biscuits_short + 1);

  // Define the biscuit shape
  const biscuit = draw([-24, 2.5])
    .bulgeArcTo([24, 2.5], -0.3)
    .tangentArcTo([24, -2.5])
    .bulgeArcTo([-24, -2.5], -0.3)
    .tangentArcTo([-24, 2.5])
    .close()
    .sketchOnPlane("XZ", -1.5)
    .extrude(3);

  // --- Side Board Biscuits (Top) ---
  const side_board_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_long; i++) {
    const biscuitInstance = biscuit.clone().translate(between_long + 25 + i * (50 + between_long), -width / 2 + board_thickness / 2, bottom_shelf_height);
    side_board_biscuits_top_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const side_board_biscuits_top = makeCompound(side_board_biscuits_top_array); // Used for cutting, not added to closet

  // --- Side Board Biscuits (Side) ---
  const side_board_biscuits_side_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().rotate(90, [0, 0, 0], [1, 0, 0]).translate(between_middle + 25 + i * (50 + between_middle), -width / 2 + board_thickness, 3 * board_thickness / 2);
    side_board_biscuits_side_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const side_board_biscuits_side = makeCompound(side_board_biscuits_side_array); // Used for cutting, not added to closet

  // --- Side Boards ---
  const side_board = makeBox([0, -width / 2, 0], [depth, -width / 2 + board_thickness, bottom_shelf_height])
    .cut(side_board_biscuits_top)
    .cut(side_board_biscuits_side);
  closet.push(side_board);
  closet.push(side_board.clone().mirror("XZ"));

  // --- Side Board Tapes ---
  const side_board_tape = makeBox([depth, -width / 2, 0], [depth + 2, -width / 2 + board_thickness, bottom_shelf_height]);
  closet.push(side_board_tape);
  closet.push(side_board_tape.clone().mirror("XZ"));

  // --- Bottom Divider Biscuits (Bottom) ---
  const bottom_divider_biscuits_bottom_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().translate(between_middle + 25 + i * (50 + between_middle), width / 6, 2 * board_thickness);
    bottom_divider_biscuits_bottom_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const bottom_divider_biscuits_bottom = makeCompound(bottom_divider_biscuits_bottom_array); // Used for cutting, not added to closet

  // --- Horizontal Board 1 ---
  const horizontal_board1 = makeBox([0, -width / 2 + board_thickness, board_thickness], [depth - board_thickness - 2, width / 2 - board_thickness, 2 * board_thickness])
    .cut(side_board_biscuits_side) // Cut for side board connection
    .cut(side_board_biscuits_side.mirror("XZ")) // Cut for other side board connection
    .cut(bottom_divider_biscuits_bottom) // Cut for bottom divider connection
    .cut(bottom_divider_biscuits_bottom.clone().mirror("XZ")); // Cut for other bottom divider connection
  closet.push(horizontal_board1);

  // --- Horizontal Board 1 Tape ---
  const horizontal_board1_tape = makeBox([depth - board_thickness - 2, -width / 2 + board_thickness, board_thickness], [depth - board_thickness, width / 2 - board_thickness, 2 * board_thickness]);
  closet.push(horizontal_board1_tape);

  // --- Bottom Divider Biscuits (Top) ---
  const bottom_divider_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_middle; i++) {
    const biscuitInstance = biscuit.clone().translate(between_middle + 25 + i * (50 + between_middle), width / 6, bottom_shelf_height);
    bottom_divider_biscuits_top_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const bottom_divider_biscuits_top = makeCompound(bottom_divider_biscuits_top_array); // Used for cutting, not added to closet

  // --- Bottom Dividers ---
  const bottom_divider = makeBox([0, width / 6 - board_thickness / 2, 2 * board_thickness], [depth - board_thickness - 2, width / 6 + board_thickness / 2, bottom_shelf_height])
    .cut(bottom_divider_biscuits_bottom)
    .cut(bottom_divider_biscuits_top);
  closet.push(bottom_divider);
  closet.push(bottom_divider.clone().mirror("XZ"));

  // --- Bottom Divider Tapes ---
  const bottom_divider_tape = makeBox([depth - board_thickness - 2, width / 6 - board_thickness / 2, 2 * board_thickness], [depth - board_thickness, width / 6 + board_thickness / 2, bottom_shelf_height]);
  closet.push(bottom_divider_tape);
  closet.push(bottom_divider_tape.clone().mirror("XZ"));

  // --- Vertical Board Biscuits (Bottom) ---
  const vertical_board_biscuits_bottom_array = [];
  for (let i = 0; i < nr_biscuits_short; i++) {
    const biscuitInstance = biscuit.clone().translate(between_short + 25 + i * (50 + between_short), width / 4, bottom_shelf_height + board_thickness);
    vertical_board_biscuits_bottom_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const vertical_board_biscuits_bottom = makeCompound(vertical_board_biscuits_bottom_array); // Used for cutting, not added to closet

  // --- Horizontal Board 2 ---
  const horizontal_board2 = makeBox([0, -width / 2, bottom_shelf_height], [depth, width / 2, bottom_shelf_height + board_thickness])
    .cut(side_board_biscuits_top) // Cut for side board connection
    .cut(side_board_biscuits_top.mirror("XZ")) // Cut for other side board connection
    .cut(bottom_divider_biscuits_top) // Cut for bottom divider connection
    .cut(bottom_divider_biscuits_top.mirror("XZ")) // Cut for other bottom divider connection
    .cut(vertical_board_biscuits_bottom) // Cut for vertical board connection
    .cut(vertical_board_biscuits_bottom.clone().mirror("XZ")); // Cut for other vertical board connection
  closet.push(horizontal_board2);

  // --- Horizontal Board 2 Tape ---
  const horizontal_board2_tape = makeBox([depth, -width / 2, bottom_shelf_height], [depth + 2, width / 2, bottom_shelf_height + board_thickness]);
  closet.push(horizontal_board2_tape);

  // --- Vertical Board Biscuits (Top) ---
  const vertical_board_biscuits_top_array = [];
  for (let i = 0; i < nr_biscuits_short; i++) {
    const biscuitInstance = biscuit.clone().translate(between_short + 25 + i * (50 + between_short), width / 4, bottom_shelf_height + 6 * (board_thickness + shelf_height));
    vertical_board_biscuits_top_array.push(biscuitInstance); // Original for cutting compound
    closet.push(biscuitInstance.clone()); // Add CLONE to final closet array
    closet.push(biscuitInstance.clone().mirror("XZ")); // Add CLONE of mirrored to final closet array
  }
  const vertical_board_biscuits_top = makeCompound(vertical_board_biscuits_top_array); // Used for cutting, not added to closet

  // --- Vertical Board Biscuits (Side - Placeholder/Incomplete in original) ---
  // The original loop for vertical_board_biscuits_side_array was incorrect (nested i) and didn't add anything.
  // Assuming biscuits are needed for shelves connecting to this vertical board.
  // This needs refinement based on actual shelf connections. For now, creating an empty compound.
  const vertical_board_biscuits_side_array = [];
  // Example: Add biscuits for shelf connections if needed
  // for (let shelf_level = 0; shelf_level < 5; shelf_level++) { // Assuming 5 shelves connect
  //   for (let i = 0; i < nr_biscuits_short; i++) {
  //      const yPos = width / 4 - board_thickness / 2; // Or + board_thickness / 2 depending on side
  //      const zPos = bottom_shelf_height + (shelf_level + 1) * (board_thickness + shelf_height) + board_thickness / 2;
  //      const biscuitInstance = biscuit.clone().rotate(90, [0,0,0], [0,0,1]).translate(between_short + 25 + i * (50 + between_short), yPos, zPos);
  //      vertical_board_biscuits_side_array.push(biscuitInstance);
  //      closet.push(biscuitInstance);
  //      closet.push(biscuitInstance.clone().mirror("XZ"));
  //   }
  // }
  const vertical_board_biscuits_side = makeCompound(vertical_board_biscuits_side_array); // Used for cutting, not added to closet (currently empty anyway)

  // --- Vertical Boards ---
  const vertical_board = makeBox([0, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)])
    .cut(vertical_board_biscuits_bottom)
    .cut(vertical_board_biscuits_top)
    .cut(vertical_board_biscuits_side); // Cut for shelf connections (currently empty)
  closet.push(vertical_board);
  closet.push(vertical_board.clone().mirror("XZ"));

  // --- Vertical Board Tapes ---
  const vertical_board_tape = makeBox([2 * depth / 3, width / 4 - board_thickness / 2, bottom_shelf_height + board_thickness], [2 * depth / 3 + 2, width / 4 + board_thickness / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)]);
  closet.push(vertical_board_tape);
  closet.push(vertical_board_tape.clone().mirror("XZ"));

  // --- Horizontal Board 3 (Top Board) ---
  const horizontal_board3 = makeBox([0, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height])
    .cut(vertical_board_biscuits_top) // Cut for vertical board connection
    .cut(vertical_board_biscuits_top.mirror("XZ")); // Cut for other vertical board connection
  closet.push(horizontal_board3);

  // --- Horizontal Board 3 Tape ---
  const horizontal_board3_tape = makeBox([depth, -width / 2, bottom_shelf_height + 6 * (board_thickness + shelf_height)], [depth + 2, width / 2, bottom_shelf_height + 7 * board_thickness + 6 * shelf_height]);
  closet.push(horizontal_board3_tape);

  // --- Shelves (Placeholder - Original code had definitions but didn't add them to 'closet') ---
  // Add shelves based on requirements, potentially cutting biscuit slots
  // Example:
  // const shelf_z_positions = [ ... ]; // Calculate Z positions for each shelf
  // shelf_z_positions.forEach(z => {
  //    const shelf = makeBox(...)
  //       .cut(...) // Cut biscuit slots if needed
  //    closet.push(shelf);
  // });

  // --- Doors ---
  const side_door = makeBox([depth - board_thickness, -width / 2 + board_thickness + 4, board_thickness], [depth, -width / 6 - 3, bottom_shelf_height - 4]);
  closet.push(side_door);
  closet.push(side_door.clone().mirror("XZ"));

  const middle_door = makeBox([depth - board_thickness, -width / 6 + 3, board_thickness], [depth, width / 6 - 3, bottom_shelf_height - 4]);
  closet.push(middle_door);

  // --- Door Tapes ---
  const side_door_tape_inner = makeBox([depth - board_thickness, -width / 6 - 3, board_thickness], [depth, -width / 6 - 1, bottom_shelf_height - 4]); // Adjusted Y
  const side_door_tape_outer = makeBox([depth - board_thickness, -width / 2 + board_thickness + 2, board_thickness], [depth, -width / 2 + board_thickness + 4, bottom_shelf_height - 4]); // Adjusted Y
  const side_door_tape_top = makeBox([depth - board_thickness, -width / 2 + board_thickness + 4, bottom_shelf_height - 4], [depth, -width / 6 - 3, bottom_shelf_height - 2]);
  const side_door_tape_bottom = makeBox([depth - board_thickness, -width / 2 + board_thickness + 4, board_thickness], [depth, -width / 6 - 3, board_thickness + 2]); // Adjusted Z
  closet.push(side_door_tape_inner);
  closet.push(side_door_tape_outer);
  closet.push(side_door_tape_top);
  closet.push(side_door_tape_bottom);
  closet.push(side_door_tape_inner.clone().mirror("XZ"));
  closet.push(side_door_tape_outer.clone().mirror("XZ"));
  closet.push(side_door_tape_top.clone().mirror("XZ"));
  closet.push(side_door_tape_bottom.clone().mirror("XZ"));

  const middle_door_tape_left = makeBox([depth - board_thickness, -width / 6 + 1, board_thickness], [depth, -width / 6 + 3, bottom_shelf_height - 4]); // Adjusted Y
  const middle_door_tape_right = makeBox([depth - board_thickness, width / 6 - 3, board_thickness], [depth, width / 6 - 1, bottom_shelf_height - 4]); // Adjusted Y
  const middle_door_tape_top = makeBox([depth - board_thickness, -width / 6 + 3, bottom_shelf_height - 4], [depth, width / 6 - 3, bottom_shelf_height - 2]);
  const middle_door_tape_bottom = makeBox([depth - board_thickness, -width / 6 + 3, board_thickness], [depth, width / 6 - 3, board_thickness + 2]); // Adjusted Z
  closet.push(middle_door_tape_left);
  closet.push(middle_door_tape_right);
  closet.push(middle_door_tape_top);
  closet.push(middle_door_tape_bottom);

  // --- Handles ---
  // Adjusted handle position slightly for better placement relative to door edge
  const handle_y = -width / 6 + 3 + 20; // Example Y position near edge of middle door
  const handle_z = bottom_shelf_height / 2; // Example Z position
  const handle = makeCylinder(5, 20, [depth, handle_y, handle_z], [1, 0, 0])
                 .fuse(makeCylinder(10, 10, [depth + 20, handle_y, handle_z], [1, 0, 0]));
  closet.push(handle); // Middle door handle
  closet.push(handle.clone().mirror("XZ")); // Other middle door handle (mirrored Y)

  // Side door handles (adjust Y position)
  const side_handle_y = -width / 2 + board_thickness + 4 + 20; // Example Y position near edge of side door
  closet.push(handle.clone().translateY(side_handle_y - handle_y));
  closet.push(handle.clone().translateY(side_handle_y - handle_y).mirror("XZ"));


  // Return a single compound shape containing all parts
  return makeCompound(closet);
}

// Model definition
export const closetModel = {
  name: "Closet",
  create: createCloset,
  params: [
    { name: "width", defaultValue: 2000, description: "Overall width of the closet" },
    { name: "depth", defaultValue: 500, description: "Overall depth of the closet" },
    { name: "board_thickness", defaultValue: 30, description: "Thickness of the boards used" }
  ],
  validators: [
    validateAll(isPositive, ["width", "depth", "board_thickness"])
  ],
  hasExplosion: false, // Set to true if explosion logic is added
  hasBoM: true // Indicates this model likely has a Bill of Materials
};

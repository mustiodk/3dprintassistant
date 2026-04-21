# Bambu Studio JSON Profile Schema — Research

> Extracted from BambuStudio GitHub repo (2026-04-05)
> Source: `bambulab/BambuStudio/resources/profiles/BBL/`

## Key Patterns

1. **Inheritance model:** Profiles inherit from parents via `"inherits"` field.
   - `fdm_process_common.json` → `fdm_process_single_0.20` → `0.20mm Standard @BBL X1C.json`
   - `fdm_filament_common.json` → `fdm_filament_pla.json` → specific brand PLA presets
2. **All values are strings** (even numbers: `"3"`, `"0.2"`, `"15%"`)
3. **Array values** represent multi-extruder support: `["300", "400"]` = [extruder1, extruder2]
4. **Metadata fields:** `type`, `name`, `from`, `inherits`, `instantiation`, `setting_id`, `compatible_printers`, `compatible_printers_condition`
5. **Import supports:** `.json`, `.bbscfg`, `.bbsflmt`, `.zip`

---

## Process Profile Schema (fdm_process_common.json — all fields)

### Metadata
| Field | Example | Notes |
|-------|---------|-------|
| type | "process" | Always "process" |
| name | "0.20mm Standard @BBL X1C" | Display name |
| from | "system" / "user" | Origin |
| inherits | "fdm_process_single_0.20" | Parent profile |
| instantiation | "true" / "false" | If true = concrete preset |
| setting_id | "GP004" | Internal ID |
| description | "It has a general layer height..." | Human description |
| compatible_printers | ["Bambu Lab X1 Carbon 0.4 nozzle", ...] | Which printers this applies to |
| compatible_printers_condition | "" | Condition expression |

### Quality / Layer
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| layer_height | (inherited) | layer_height |
| initial_layer_print_height | "0.2" | initial_layer_height |
| line_width | "0.42" | (not directly mapped) |
| initial_layer_line_width | "0.5" | initial_layer_line_width |
| inner_wall_line_width | "0.45" | inner_wall_line_width |
| outer_wall_line_width | "0.42" | outer_wall_line_width |
| sparse_infill_line_width | "0.45" | sparse_infill_line_width |
| internal_solid_infill_line_width | "0.42" | internal_solid_infill_line_width |
| top_surface_line_width | "0.42" | top_surface_line_width |
| adaptive_layer_height | "0" | — |
| seam_position | "aligned" | seam_position |
| wall_generator | "classic" | wall_generator |
| elefant_foot_compensation | "0" | elephant_foot_compensation |

### Strength / Shell
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| wall_loops | "2" | wall_loops |
| top_shell_layers | "3" | top_shell_layers |
| top_shell_thickness | "0.8" | — |
| bottom_shell_layers | "3" | bottom_shell_layers |
| bottom_shell_thickness | "0" | — |
| sparse_infill_density | "15%" | sparse_infill_density |
| sparse_infill_pattern | "grid" | sparse_infill_pattern |
| top_surface_pattern | "monotonicline" | top_surface_pattern |
| bottom_surface_pattern | "monotonic" | bottom_surface_pattern |
| infill_direction | "45" | — |
| infill_wall_overlap | "15%" | — |
| wall_infill_order | "inner wall/outer wall/infill" | — |

### Speed
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| outer_wall_speed | ["200"] | outer_wall_speed |
| inner_wall_speed | ["300"] | inner_wall_speed |
| sparse_infill_speed | ["50"] | sparse_infill_speed |
| internal_solid_infill_speed | ["250"] | internal_solid_infill_speed |
| top_surface_speed | ["30"] | top_surface_speed |
| bridge_speed | ["25"] | bridge_speed |
| gap_infill_speed | ["250"] | gap_infill_speed |
| initial_layer_speed | ["50"] | initial_layer_speed |
| travel_speed | ["400"] | travel_speed |
| small_perimeter_speed | ["50%"] | — |

### Acceleration
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| default_acceleration | ["10000"] | default_acceleration |
| outer_wall_acceleration | ["5000"] | outer_wall_acceleration |
| inner_wall_acceleration | ["10000"] | inner_wall_acceleration |
| sparse_infill_acceleration | ["100%"] | — |
| top_surface_acceleration | ["2000"] | top_surface_acceleration |
| initial_layer_acceleration | ["500"] | initial_layer_acceleration |
| travel_acceleration | ["10000"] | travel_acceleration |
| initial_layer_travel_acceleration | ["6000"] | — |

### Support
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| enable_support | "0" | enable_support |
| support_type | "normal(auto)" | support_type |
| support_style | "default" | support_style |
| support_threshold_angle | "30" | support_threshold_angle |
| support_base_pattern | "default" | — |
| support_base_pattern_spacing | "2.5" | — |
| support_interface_top_layers | "2" | — |
| support_interface_bottom_layers | "2" | — |
| support_interface_pattern | "auto" | — |
| support_interface_spacing | "0.5" | — |
| support_top_z_distance | "0.2" | support_z_distance |
| support_bottom_z_distance | "0.2" | — |
| support_expansion | "0" | — |
| tree_support_branch_angle | "45" | — |
| tree_support_branch_diameter | "2" | — |

### Others / Special
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| brim_width | "5" | brim_width |
| brim_object_gap | "0.1" | — |
| enable_prime_tower | "1" | — |
| spiral_mode | "0" | spiral_vase |
| ironing_type | "no ironing" | ironing |
| ironing_speed | "15" | — |
| ironing_flow | "10%" | — |
| ironing_spacing | "0.1" | — |
| draft_shield | "disabled" | — |
| bridge_flow | "0.95" | bridge_flow |
| skirt_loops | "0" | — |
| skirt_distance | "2" | — |
| xy_contour_compensation | "0" | xy_contour_compensation |
| xy_hole_compensation | "0" | xy_hole_compensation |

### Slowdown / Height
| BS Field | Default | Notes |
|----------|---------|-------|
| enable_height_slowdown | "0" | — |
| slowdown_start_height | "0" | — |
| slowdown_start_speed | "1000" | — |
| slowdown_end_height | "400" | — |
| slowdown_end_speed | "1000" | — |
| slow_down_for_layer_cooling | "1" | Slow down when layer time < threshold |
| slow_down_layers | "0" | — |

### Misc
| BS Field | Default | Notes |
|----------|---------|-------|
| detect_overhang_wall | "1" | — |
| detect_thin_wall | "0" | — |
| enable_arc_fitting | "1" | — |
| enable_overhang_speed | "1" | — |
| enable_wrapping_detection | "0" | — |
| filename_format | "{input_filename_base}_{filament_type[0]}..." | — |
| smooth_coefficient | "80" | — |

---

## Filament Profile Schema (fdm_filament_common.json — key fields)

### Metadata
| Field | Example |
|-------|---------|
| type | "filament" |
| name | "fdm_filament_pla" |
| inherits | "fdm_filament_common" |
| from | "system" |

### Temperature
| BS Field | PLA Default | engine.js equivalent |
|----------|-------------|---------------------|
| nozzle_temperature | ["220"] | nozzle_temp |
| nozzle_temperature_initial_layer | ["220"] | nozzle_temp_initial |
| hot_plate_temp | ["55"] → (in common) | bed_temp (hot plate) |
| hot_plate_temp_initial_layer | ["55"] | bed_temp_initial |
| cool_plate_temp | ["35"] | bed_temp (cool plate) |
| cool_plate_temp_initial_layer | ["35"] | — |
| textured_plate_temp | ["55"] | bed_temp (textured) |
| textured_plate_temp_initial_layer | ["55"] | — |
| eng_plate_temp | ["0"] | bed_temp (engineering) |
| eng_plate_temp_initial_layer | ["0"] | — |
| temperature_vitrification | ["45"] | — |

### Cooling / Fan
| BS Field | PLA Default | engine.js equivalent |
|----------|-------------|---------------------|
| fan_min_speed | ["100"] | fan_speed_min |
| fan_max_speed | ["100"] | fan_speed_max |
| additional_cooling_fan_speed | ["70"] | — |
| close_fan_the_first_x_layers | ["1"] | — |
| fan_cooling_layer_time | ["100"] | — |
| overhang_fan_threshold | ["50%"] | — |
| slow_down_layer_time | ["4"] | — |
| slow_down_min_speed | ["20"] | — |
| reduce_fan_stop_start_freq | ["1"] | — |

### Flow / Extrusion
| BS Field | Default | engine.js equivalent |
|----------|---------|---------------------|
| filament_max_volumetric_speed | ["12"] | max_volumetric_speed |
| filament_flow_ratio | ["0.98"] | flow_ratio |
| pressure_advance | ["0.02"] | pressure_advance |
| filament_retraction_length | ["0.8"] | retraction_length |
| filament_retraction_speed | ["30"] | retraction_speed |
| filament_deretraction_speed | ["0"] | — |
| filament_retraction_minimum_travel | ["1"] | — |
| filament_retract_when_changing_layer | ["0"] | — |
| filament_wipe | ["0"] | — |
| filament_wipe_distance | ["1"] | — |
| filament_z_hop | ["0"] | — |
| filament_z_hop_types | ["Auto Lift"] | — |
| filament_retract_before_wipe | ["0%"] | — |

### Material Properties
| BS Field | Default | Notes |
|----------|---------|-------|
| filament_type | ["PLA"] | Material type string |
| filament_vendor | ["Generic"] | Brand name |
| filament_cost | ["20"] | Per kg cost |
| filament_density | ["1.24"] | g/cm³ |
| filament_diameter | ["1.75"] | mm |
| filament_colour | ["#00AE42"] | Hex color |
| filament_scarf_gap | ["15%"] | — |

### Drying / AMS
| BS Field | Default | Notes |
|----------|---------|-------|
| filament_dev_ams_drying_temperature | — | AMS drying temp |
| filament_dev_ams_drying_time | — | AMS drying hours |
| filament_dev_drying_softening_temperature | — | Max safe temp |
| filament_dev_ams_drying_ams_limitations | — | AMS compat notes |
| filament_dev_chamber_drying_bed_temperature | ["70"] | Bed drying temp |

### Gcode
| BS Field | Notes |
|----------|-------|
| filament_start_gcode | Startup commands (fan for bed temp, air filtration) |
| filament_end_gcode | Shutdown commands |

---

## Key Observations for Export Implementation

1. **We need TWO export files:** process profile (.json) AND filament profile (.json). They are separate files in Bambu Studio.

2. **Values must be strings.** Even numeric values: `"0.2"` not `0.2`, `"15%"` not `15`.

3. **Array format for multi-extruder:** Single extruder = `["value"]`, dual = `["val1", "val2"]`. Our users mostly have single, so `["value"]` arrays.

4. **Inheritance can be used or not.** For user-exported profiles, setting `"from": "user"` and `"inherits": ""` with all values explicit is simplest and most portable.

5. **The `compatible_printers` field** maps the process profile to specific printers. Must match Bambu Studio printer name format exactly: `"Bambu Lab P1S 0.4 nozzle"`.

6. **Our engine already calculates most of these values.** The main work is field-name translation from engine.js param IDs to Bambu Studio field names.

7. **Bed temp depends on plate type.** Bambu Studio has separate fields per plate: `cool_plate_temp`, `hot_plate_temp`, `textured_plate_temp`, `eng_plate_temp`. Our engine could populate the one matching the user's selected build plate.

8. **Import path for users:** File > Import > Configs > select .json file. Bambu Studio accepts plain .json alongside .bbscfg/.bbsflmt/.zip.

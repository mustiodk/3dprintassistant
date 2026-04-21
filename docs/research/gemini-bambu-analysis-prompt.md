# Prompt: Analyze Bambu Studio JSON Profile Schema for Export Implementation

## Your Role
You are a technical analyst helping me build a "Export to Bambu Studio" feature for my 3D print profile configurator web app. My app generates recommended print settings — I need to export them as .json files that Bambu Studio can import without errors.

## What I Need
Analyze the attached Bambu Studio profile .json files and produce a **complete field mapping specification** that my developer can use to implement the export function.

## Attached Files
I'm attaching the following files exported from Bambu Studio (user-exported profiles from an actual installation):

[LIST THE FILES YOU'RE ATTACHING HERE — e.g. "process profile for 0.20mm Standard @P1S", "filament profile for Generic PLA", etc.]

## Analysis Tasks

### 1. Process Profile Schema
For each field in the process profile .json:
- **Field name** (exact key)
- **Value type** (string, array of strings, number-as-string, boolean-as-string, percentage-as-string)
- **Example value** from the attached file
- **Required or optional** for successful import (if you can tell)
- **What it controls** (one-line description)

### 2. Filament Profile Schema
Same analysis for the filament profile .json.

### 3. Metadata Fields (CRITICAL)
Bambu Studio's import is strict about metadata. For EACH of these, tell me:
- `type` — exact expected value
- `name` — naming convention (does it matter? what format?)
- `from` — must it be `"user"`?
- `inherits` — can it be empty `""`? Or must it reference a real parent?
- `instantiation` — must it be `"true"`?
- `setting_id` — is it required? What format?
- `version` — is there a version field? What value does it need?
- `compatible_printers` — exact format. List every Bambu printer name string as it appears
- `compatible_printers_condition` — required?
- Any OTHER metadata fields that are required for import to succeed

### 4. Value Format Rules
Document every value format pattern you see:
- How are speeds formatted? (e.g. `["300"]` or `"300"` or `["300", "300"]`)
- How are temperatures formatted?
- How are percentages formatted? (`"15%"` vs `"15"` vs `"0.15"`)
- How are booleans formatted? (`"0"`/`"1"` or `"true"`/`"false"`)
- How are enums formatted? (e.g. seam_position values, infill pattern names — exact strings)
- Do single-extruder values need array wrapping `["val"]` or plain `"val"`?

### 5. Field Mapping Table
Produce a mapping table with these columns:

| My App Field | Bambu Studio Field | Value Format | Transform Needed | Notes |
|---|---|---|---|---|

My app's engine outputs these parameters (not all may map):

**Process params (speeds, layers, walls, etc.):**
layer_height, initial_layer_height, outer_wall_line_width, inner_wall_line_width, sparse_infill_line_width, internal_solid_infill_line_width, top_surface_line_width, initial_layer_line_width, seam_position, wall_generator, elephant_foot_compensation, wall_loops, top_shell_layers, bottom_shell_layers, sparse_infill_density, sparse_infill_pattern, top_surface_pattern, bottom_surface_pattern, outer_wall_speed, inner_wall_speed, sparse_infill_speed, internal_solid_infill_speed, top_surface_speed, bridge_speed, gap_infill_speed, initial_layer_speed, travel_speed, default_acceleration, outer_wall_acceleration, inner_wall_acceleration, top_surface_acceleration, initial_layer_acceleration, travel_acceleration, enable_support, support_type, support_style, support_threshold_angle, support_z_distance, brim_width, spiral_vase, ironing, bridge_flow, xy_hole_compensation, xy_contour_compensation

**Filament params (temps, flow, retraction, etc.):**
nozzle_temperature, nozzle_temperature_initial_layer, bed_temperature, bed_temperature_initial_layer, fan_min_speed, fan_max_speed, filament_max_volumetric_speed, filament_flow_ratio, pressure_advance, retraction_length, retraction_speed

**My app outputs values like:**
- `"0.2 mm"` (with unit suffix)
- `"300 mm/s"` (with unit suffix)
- `"5000 mm/s²"` (with unit suffix)
- `"15%"` (percentage)
- `"Gyroid"` (capitalized enum)
- `"aligned"` (lowercase enum)

Tell me exactly what transforms are needed for each field.

### 6. Minimum Viable Export
Give me the **smallest possible valid .json** for both process and filament profiles that Bambu Studio will accept on import. Strip out everything optional — just the fields that MUST be present. Use a concrete example (e.g. PLA on a P1S with 0.4mm nozzle, 0.20mm layer height).

### 7. Compatible Printer Names
List ALL Bambu Lab printer preset name strings exactly as they appear in the files. These must be exact for `compatible_printers` to work. Format:
```
"Bambu Lab X1 Carbon 0.4 nozzle"
"Bambu Lab P1S 0.4 nozzle"
...
```

### 8. Known Gotchas
List anything that could cause import to silently fail, show an error, or produce wrong results:
- Fields with typos in Bambu's schema (e.g. `elefant_foot_compensation` — yes, that's their typo)
- Fields where the value format is unexpected
- Fields that look optional but are actually required
- Enum values that must be exact strings
- Array vs non-array inconsistencies
- Anything else surprising

## Output Format
Structure your response with clear headers matching the 8 sections above. Use code blocks for JSON examples. Make the mapping table copy-pasteable.

I need this to be COMPLETE and EXACT — my developer will use this as the sole reference to implement the export function. Any missing or wrong field will cause Bambu Studio to reject the import.

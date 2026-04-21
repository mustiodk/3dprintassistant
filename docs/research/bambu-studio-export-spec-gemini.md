This is a fun and highly technical challenge. Building a configuration generator that outputs Slic3r-dialect JSON files (which Bambu Studio is built on) requires strict adherence to their type formatting. Bambu Studio is notoriously unforgiving with bad imports; a single wrong type (like passing a boolean instead of a string boolean) will cause the profile to silently fail or crash the import sequence.

Based on the attached .json and bundle files, here is the complete field mapping specification your developer needs to build the export feature.

### **1\. Process Profile Schema**

Because Bambu Studio uses an inheritance model, **most fields are technically optional**. If a field is omitted, it simply inherits the value from the parent profile.

Here is the schema for the key fields found in your process profile files:

* **layer\_height**: String. Example: "0.16". (Optional override). Controls the primary layer height.  
* **initial\_layer\_print\_height**: String. Example: "0.16". (Optional override). Controls the first layer height.  
* **wall\_loops**: String. Example: "3". (Optional override). Controls the number of wall perimeters.  
* **top\_shell\_layers** / **bottom\_shell\_layers**: String. Example: "6". (Optional override). Top/bottom solid layers.  
* **sparse\_infill\_density**: String (Percentage). Example: "60%". (Optional override). Infill density.  
* **sparse\_infill\_pattern**: String. Example: "gyroid". (Optional override). Infill pattern enum.  
* **enable\_support**: String (Boolean). Example: "1". (Optional override). Toggles supports.  
* **support\_type**: String. Example: "normal(manual)". (Optional override). Support generation style.  
* **top\_surface\_speed**, **inner\_wall\_speed**, **outer\_wall\_speed**, etc.: Array of Strings. Example: \["35", "nil"\] or \["250", "250"\]. (Optional override). Speed settings.  
* **default\_acceleration**, **outer\_wall\_acceleration**, etc.: Array of Strings. Example: \["7500", "7500"\]. (Optional override). Acceleration settings.

### **2\. Filament Profile Schema**

Similar to process profiles, filament profiles rely heavily on inheritance.

* **hot\_plate\_temp** / **textured\_plate\_temp**: Array of Strings. Example: \["60"\]. (Optional override). Bed temperature for general layers.  
* **hot\_plate\_temp\_initial\_layer** / **textured\_plate\_temp\_initial\_layer**: Array of Strings. Example: \["60"\]. (Optional override). Bed temperature for the first layer.  
* **filament\_extruder\_variant**: Array of Strings. Example: \["Direct Drive Standard", "Direct Drive High Flow"\]. (Optional override). Specifies extruder compatibility.

### **3\. Metadata Fields (CRITICAL)**

If your app gets any of these wrong, the file will not import.

* **type**: Interestingly, Bambu's individual exported JSON files do *not* contain a type field. The type is inferred by the \_settings\_id key and the folder structure.  
* **name**: Must be an exact String (e.g., "0.20mm Standard @BBL X1C \- Copy"). This dictates how it appears in the UI.  
* **from**: Must strictly be "User".  
* **inherits**: **Cannot be empty.** It must exactly match the name of a base system profile installed in Bambu Studio (e.g., "0.20mm Standard @BBL X1C" or "Bambu PLA Basic @BBL P1S 0.4 nozzle"). If your app generates unique settings, inherit the closest system default and override it.  
* **print\_settings\_id** (For Process): String. Must exactly match the name field.  
* **filament\_settings\_id** (For Filament): **Array of Strings**. Example: \["Bambu PLA Basic @60"\]. Must match the name field, but wrapped in an array. This is a common trap.  
* **version**: String. Example: "2.5.0.14". Include this to ensure parser compatibility.

### **4\. Value Format Rules**

Bambu Studio uses a quirky combination of types inherited from PrusaSlicer:

* **Numbers**: ALWAYS Strings. (e.g., "0.22", never 0.22).  
* **Booleans**: ALWAYS Strings. "0" for false, "1" for true. Never true/false.  
* **Percentages**: Strings containing the % symbol. (e.g., "8%" or "60%").  
* **Speeds and Accelerations**: Formatted as Arrays of Strings. Often multi-extruder files pad missing values with "nil" (e.g., \["20", "nil"\]) or duplicate them (e.g., \["250", "250"\]). For single extruders, \["250"\] is standard.  
* **Temperatures**: Formatted as Arrays of Strings. (e.g., \["60"\]).  
* **Enums**: Lowercase strings with no spaces. (e.g., "gyroid", "monotonicline", "rectilinear\_interlaced").

### **5\. Field Mapping Table**

Here is exactly how your developer needs to transform your app's output before writing the JSON.

| My App Field | Bambu Studio Field | Value Format | Transform Needed | Notes |
| :---- | :---- | :---- | :---- | :---- |
| layer\_height | layer\_height | String | Strip " mm" | e.g., "0.2" |
| initial\_layer\_height | initial\_layer\_print\_height | String | Strip " mm" | e.g., "0.2" |
| wall\_loops | wall\_loops | String | Cast to string | e.g., "3" |
| top\_shell\_layers | top\_shell\_layers | String | Cast to string | e.g., "5" |
| bottom\_shell\_layers | bottom\_shell\_layers | String | Cast to string | e.g., "4" |
| sparse\_infill\_density | sparse\_infill\_density | String (%) | None | Must keep % (e.g., "15%") |
| sparse\_infill\_pattern | sparse\_infill\_pattern | String | Lowercase | "Gyroid" \-\> "gyroid" |
| enable\_support | enable\_support | String (Bool) | Map bool to "0"/"1" | true \-\> "1" |
| support\_type | support\_type | String | Map to exact enum | e.g., "normal(auto)" |
| outer\_wall\_speed | outer\_wall\_speed | Array of Strings | Strip " mm/s", wrap in \[\] | "300 mm/s" \-\> \["300"\] |
| inner\_wall\_speed | inner\_wall\_speed | Array of Strings | Strip " mm/s", wrap in \[\] | "300 mm/s" \-\> \["300"\] |
| travel\_speed | travel\_speed | Array of Strings | Strip " mm/s", wrap in \[\] | "500 mm/s" \-\> \["500"\] |
| default\_acceleration | default\_acceleration | Array of Strings | Strip " mm/s²", wrap in \[\] | "5000 mm/s²" \-\> \["5000"\] |
| bed\_temperature | hot\_plate\_temp & textured\_plate\_temp | Array of Strings | Cast to string, wrap in \[\] | Set both fields to be safe |
| bed\_temperature\_initial\_layer | hot\_plate\_temp\_initial\_layer & textured\_plate\_temp\_initial\_layer | Array of Strings | Cast to string, wrap in \[\] | Set both fields to be safe |

*(Note: Fields like nozzle\_temperature, retraction\_length, and line widths follow the exact same String/Array string format. Your dev just needs to strip the unit suffixes and cast them to the Bambu JSON type).*

### **6\. Minimum Viable Export**

To minimize import failures, only export the necessary metadata and the exact fields your app overrides.

**Process Profile (My App Process.json):**

JSON

{  
    "from": "User",  
    "inherits": "0.20mm Standard @BBL P1S",  
    "name": "My App Process",  
    "print\_settings\_id": "My App Process",  
    "version": "2.5.0.14",  
    "layer\_height": "0.20",  
    "sparse\_infill\_density": "15%",  
    "sparse\_infill\_pattern": "gyroid",  
    "enable\_support": "0"  
}

**Filament Profile (My App PLA.json):**

JSON

{  
    "from": "User",  
    "inherits": "Bambu PLA Basic @BBL P1S 0.4 nozzle",  
    "name": "My App PLA",  
    "filament\_settings\_id": \[  
        "My App PLA"  
    \],  
    "version": "2.5.0.14",  
    "hot\_plate\_temp": \[  
        "60"  
    \],  
    "hot\_plate\_temp\_initial\_layer": \[  
        "65"  
    \]  
}

### **7\. Compatible Printer Names**

Based on the provided profiles and configuration files, here are the exact strings for compatible Bambu Lab printers. When referencing an inherits base or targeting a printer, use these exact strings:

* "Bambu Lab X1 Carbon 0.4 nozzle"  
* "Bambu Lab P1S 0.4 nozzle"  
* "Bambu Lab P1S 0.6 nozzle"  
* "Bambu Lab A1 0.4 nozzle"  
* "Bambu Lab A1 mini 0.4 nozzle" (Standard assumed compatible)  
* "Bambu Lab X1 Carbon 0.6 nozzle" (Standard assumed compatible)

### **8\. Known Gotchas**

Pass this list directly to your developer:

1. **The Array/String Split:** Notice how print\_settings\_id is a String, but filament\_settings\_id is an Array of Strings. This is a legacy quirk and getting it wrong will instantly fail the import.  
2. **Number casting:** Ensure absolutely no floats or integers make it into the JSON output. Slic3r-based parsers will throw silent errors. Everything must be stringified.  
3. **Inheritance requirement:** You cannot create a "blank" profile. You *must* target an existing system profile string in the inherits field (e.g., "Bambu PLA Basic @BBL P1S 0.4 nozzle"). If the user selects a P1S in your app, your code needs to dynamically inject the correct P1S string into the inherits field.  
4. **Enums:** If your app outputs "Aligned" for seam position, Bambu Studio expects "aligned". Ensure all enums are mapped to lowercase.  
5. **Speeds and "nil":** While Bambu's exports sometimes write arrays like \["20", "nil"\], a standard \["20"\] is perfectly valid and generally safer to generate programmatically.

Let me know if you need the exact enum string mappings for specific settings (like support styles or seam positions)\!
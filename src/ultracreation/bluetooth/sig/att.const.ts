/// https://btprodspecificationrefs.blob.core.windows.net/assigned-values/16-bit%20UUID%20Numbers%20Document.pdf

/// default MTU
export const MTU_DEFAULT    = 23;
export const MTU_MAX        = 512;

///  Attribute Error Code from BT 4.0 specs
export const enum Error
{
    ///  0x00: No error
    NO_ERROR                = 0x00,
    ///  0x01: Handle is invalid
    INVALID_HANDLE          = 0x01,
    ///  0x02: Read permission disabled
    READ_NOT_PERMITTED      = 0x02,
    ///  0x03: Write permission disabled
    WRITE_NOT_PERMITTED     = 0x03,
    ///  0x04: Incorrect PDU
    INVALID_PDU             = 0x04,
    ///  0x05: Authentication privilege not enough
    INSUFF_AUTHEN           = 0x05,
    ///  0x06: Request not supported or not understood
    REQUEST_NOT_SUPPORTED   = 0x06,
    ///  0x07: Incorrect offset value
    INVALID_OFFSET          = 0x07,
    ///  0x08: Authorization privilege not enough
    INSUFF_AUTHOR           = 0x08,
    ///  0x09: Capacity queue for reliable write reached
    PREPARE_QUEUE_FULL      = 0x09,
    ///  0x0A: Attribute requested not existing
    ATTRIBUTE_NOT_FOUND     = 0x0A,
    ///  0x0B: Attribute requested not long
    ATTRIBUTE_NOT_LONG      = 0x0B,
    ///  0x0C: Encryption size not sufficient
    INSUFF_ENC_KEY_SIZE     = 0x0C,
    ///  0x0D: Invalid length of the attribute value
    INVALID_ATTRIBUTE_VAL_LEN  = 0x0D,
    ///  0x0E: Operation not fit to condition
    UNLIKELY_ERR            = 0x0E,
    ///  0x0F: Attribute requires encryption before operation
    INSUFF_ENC              = 0x0F,
    ///  0x10: Attribute grouping not supported
    UNSUPP_GRP_TYPE         = 0x10,
    ///  0x11: Resources not sufficient to complete the request
    INSUFF_RESOURCE         = 0x11,
    ///  0x80: Application Error
    APP_ERROR               = 0x80,
}

/// Characteristic Properties Bit
export const enum CharProp
{
    BCAST                   = 0x01,
    RD                      = 0x02,
    WR_NO_RESP              = 0x04,
    WR                      = 0x08,
    NTF                     = 0x10,
    IND                     = 0x20,
    WR_SIGNED               = 0x40,
    EXTENDED                = 0x80,

    R_NTF                   = (RD | NTF),
    R_IND                   = (RD | IND),
    RW                      = (RD | WR),
    RW_NTF                  = (RW | NTF),
    RW_IND                  = (RW | IND),
    NTF_OR_IND_FLAGS        = (NTF | IND)
}

/// Characteristic Client Configure Description values
/*
    #define CONFIG_NTF         (1)
    #define CONFIG_IND         (2)
*/

/// Characteristic Permission Bit
/*
    permission variants by bluetooth stack's implementation
        but it can decides by characteristic's property
*/
/*
    // Reading Permissions
    #define ATTR_PERM_RD                (0x01)
    // if  1 == ATTR_PERM_RD
    #define ATTR_PERM_RD_ENCRYPT        (0x02)  // Attribute is readable when link is encrypted.
    #define ATTR_PERM_RD_AUTHENTICATED  (0x04)  // Attribute is readable when authenticated peers.
    #define ATTR_PERM_RD_AUTHORIZED     (0x08)  // Attribute is readable when authorized peers.

    // Writing Permissions
    #define ATTR_PERM_WR                (0x10)
    // if 1 = ATTR_PERM_WR
    #define ATTR_PERM_WR_ENCRYPT        (0x20)  // Attribute is writable when  link is encrypted.
    #define ATTR_PERM_WR_AUTHENTICATED  (0x40)  // Attribute is writable when authenticated peers.
    #define ATTR_PERM_WR_AUTHORIZED     (0x80)  // Attribute may be written only by authorized peers.
*/

///  Common 16-bit Universal Unique Identifier
export const enum SVC_UUID
{
    ///  Generic Access Profile
    GENERIC_ACCESS          = 0x1800,
    ///  Attribute Profile
    GENERIC_ATTRIBUTE       = 0x1801,
    /// Immediate alert service
    IMMEDIATE_ALERT         = 0x1802,
    /// Link Loss Service
    LINK_LOSS               = 0x1803,
    /// Tx Power Service
    TX_POWER                = 0x1804,
    /// Current Time Service
    CURRENT_TIME            = 0x1805,
    /// Reference Time Update
    REF_TIME_UPDATE         = 0x1806,
    /// Next DST Change
    NEXT_DST_CHANGE         = 0x1807,
    /// Glucose
    GLUCOSE                 = 0x1808,
    /// Health Thermometer Service
    HEALTH_THERMOM          = 0x1809,
    /// Device Information Service
    DEVICE_INFO             = 0x180A,
    /// Network availability - draft
    NETWORK_AVAIL_SVC       = 0x1808,
    /// Watchdog - draft
    WATCHDOG                = 0x1809,
    /// Heart Rate - draft
    HEART_RATE              = 0x180A,
    /// Phone Alert Status - draft
    PHONE_ALERT_STATUS      = 0x180B,
    /// Battery Service - draft
    BATTERY_SERVICE         = 0x180C,
    /// Blood pressure
    BLOOD_PRESSURE          = 0x1810,
    /// Alert Notification Service
    ALERT_NTF               = 0x1811,
    /// HID
    HID                     = 0x1812,
    /// Scan Parameters
    SCAN_PARAMETERS         = 0x1813,
    /// Running Speed and Cadence
    RUNNING_SPEED_CADENCE   = 0x1814,
    /// Cycling Speed and Cadence
    CYCLING_SPEED_CADENCE   = 0x1816,
}

export const enum UNIT_UUID
{
// ---- 0x2700
    ///  No defined unit
    UNITLESS                = 0x2700,
    ///  Length Unit - Metre
    METRE                   = 0x2701,
    // Mass unit - Kilogram
    KG                      = 0x2702,
    /// Time unit - second
    SECOND                  = 0x2703,
    /// Electric current unit - Ampere
    AMPERE                  = 0x2704,
    /// Thermodynamic Temperature unit - Kelvin
    KELVIN                  = 0x2705,
    ///  Amount of substance unit - mole
    MOLE                    = 0x2706,
    /// Luminous intensity unit - candela
    CANDELA                 = 0x2707,
// ---- 0x2710
    /// Area unit - square metres
    SQ_METER                = 0x2710,
    /// Colume unit - cubic metres
    CUBIC_METER             = 0x2711,
    /// Velocity unit - metres per second
    METRE_PER_SECOND        = 0x2712,
    /// Acceleration unit - metres per second squared
    METRES_PER_SEC_SQ       = 0x2713,
    /// Wavenumber unit - reciprocal metre
    RECIPROCAL_METER        = 0x2714,
    /// Density unit - kilogram per cubic metre
    DENS_KG_PER_CUBIC_METER = 0x2715,
    /// Surface density unit - kilogram per square metre
    KG_PER_SQ_METER         = 0x2716,
    /// Specific volume unit - cubic metre per kilogram
    CUBIC_METER_PER_KG      = 0x2717,
    /// Current density unit - ampere per square metre
    AMPERE_PER_SQ_METER     = 0x2718,
    /// Magnetic field strength unit - Ampere per metre
    AMPERE_PER_METER        = 0x2719,
    /// Amount concentration unit - mole per cubic metre
    MOLE_PER_CUBIC_METER    = 0x271A,
    /// Mass Concentration unit - kilogram per cubic metre
    MASS_KG_PER_CUBIC_METER = 0x271B,
    /// Luminance unit - candela per square metre
    CANDELA_PER_SQ_METER    = 0x271C,
    /// Refractive index unit
    REFRACTIVE_INDEX        = 0x271D,
    /// Relative permeability unit
    RELATIVE_PERMEABILITY   = 0x271E,
// ---- 0x2720
    /// Plane angle unit - radian
    RADIAN                  = 0x2720,
    /// Solid angle unit - steradian
    STERADIAN               = 0x2721,
    /// Frequency unit - Hertz
    HERTZ                   = 0x2722,
    /// Force unit - Newton
    NEWTON                  = 0x2723,
    /// Pressure unit - Pascal
    PASCAL                  = 0x2724,
    /// Energy unit - Joule
    JOULE                   = 0x2725,
    /// Power unit - Watt
    WATT                    = 0x2726,
    /// electric Charge unit - Coulomb
    COULOMB                 = 0x2727,
    /// Electric potential difference - Volt
    VOLT                    = 0x2728,
    /// Capacitance unit - Farad
    FARAD                   = 0x2729,
    /// electric resistance unit - Ohm
    OHM                     = 0x272A,
    /// Electric conductance - Siemens
    SIEMENS                 = 0x272B,
    /// Magnetic flux unit - Weber
    WEBER                   = 0x272C,
    /// Magnetic flux density unit - Tesla
    TESLA                   = 0x272D,
    /// Inductance unit - Henry
    HENRY                   = 0x272E,
    /// Temperature unit - degree Celsius
    CELSIUS                 = 0x272F,
// ---- 0x2730
    /// Luminous flux unit - lumen
    LUMEN                   = 0x2730,
    /// Illuminance unit - lux
    LUX                     = 0x2731,
    /// Activity referred to a radionuclide unit - becquerel
    BECQUEREL               = 0x2732,
    /// Absorbed dose unit - Gray
    GRAY                    = 0x2733,
    /// Dose equivalent unit - Sievert
    SIEVERT                 = 0x2734,
    /// Catalytic activity unit - Katal
    KATAL,
// ---- 0x2740
    /// Synamic viscosity unit - Pascal second
    PASCAL_SECOND           = 0x2740,
    /// Moment of force unit - Newton metre
    NEWTON_METER            = 0x2741,
    /// surface tension unit - Newton per metre
    NEWTON_PER_METER        = 0x2742,
    /// Angular velocity unit - radian per second
    RADIAN_PER_SECOND       = 0x2743,
    /// Angular acceleration unit - radian per second squared
    RADIAN_PER_SECOND_SQ    = 0x2744,
    /// Heat flux density unit - Watt per square metre
    WATT_PER_SQ_METER       = 0x2745,
    /// HEat capacity unit - Joule per Kelvin
    JOULE_PER_KELVIN        = 0x2746,
    /// Specific heat capacity unit - Joule per kilogram kelvin
    JOULE_PER_KG_KELVIN     = 0x2747,
    /// Specific Energy unit - Joule per kilogram
    JOULE_PER_KG            = 0x2748,
    /// Thermal conductivity - Watt per metre Kelvin
    WATT_PER_METER_KELVIN   = 0x2749,
    /// Energy Density unit - joule per cubic metre
    JOULE_PER_CUBIC_METER   = 0x274A,
    /// Electric field strength unit - volt per metre
    VOLT_PER_METER          = 0x274B,
    /// Electric charge density unit - coulomb per cubic metre
    COULOMB_PER_CUBIC_METER = 0x274C,
    /// Surface charge density unit - coulomb per square metre
    SURF_COULOMB_PER_SQ_METER = 0x274D,
    /// Electric flux density unit - coulomb per square metre
    FLUX_COULOMB_PER_SQ_METER = 0x274E,
    /// Permittivity unit - farad per metre
    FARAD_PER_METER         = 0x274F,
// ---- 0x2750
    /// Permeability unit - henry per metre
    HENRY_PER_METER         = 0x2750,
    /// Molar energy unit - joule per mole
    JOULE_PER_MOLE          = 0x2751,
    /// Molar entropy unit - joule per mole kelvin
    JOULE_PER_MOLE_KELVIN   = 0x2752,
    /// Exposure unit - coulomb per kilogram
    COULOMB_PER_KG          = 0x2753,
    /// Absorbed dose rate unit - gray per second
    GRAY_PER_SECOND         = 0x2754,
    /// Radiant intensity unit - watt per steradian
    WATT_PER_STERADIAN      = 0x2755,
    /// Radiance unit - watt per square meter steradian
    WATT_PER_SQ_METER_STERADIAN = 0x2756,
    /// Catalytic activity concentration unit - katal per cubic metre
    KATAL_PER_CUBIC_METER   = 0x2757,
// ---- 0x2760
    /// Time unit - minute
    MINUTE                  = 0x2760,
    /// Time unit - hour
    HOUR                    = 0x2761,
    /// Time unit - day
    DAY                     = 0x2762,
    /// Plane angle unit - degree
    ANGLE_DEGREE            = 0x2763,
    /// Plane angle unit - minute
    ANGLE_MINUTE            = 0x2764,
    /// Plane angle unit - second
    ANGLE_SECOND            = 0x2765,
    /// Area unit - hectare
    HECTARE                 = 0x2766,
    /// Volume unit - litre
    LITRE                   = 0x2767,
    /// Mass unit - tonne
    TONNE                   = 0x2768,
// ---- 0x2770
    // none yet.
// ---- 0x2780
    /// Pressure unit - bar
    BAR                     = 0x2780,
    /// Pressure unit - millimetre of mercury
    MM_MERCURY              = 0x2781,
    /// Length unit - angstrom
    ANGSTROM                = 0x2782,
    /// Length unit - nautical mile
    NAUTICAL_MILE           = 0x2783,
    /// Area unit - barn
    BARN                    = 0x2784,
    /// Velocity unit - knot
    KNOT                    = 0x2785,
    /// Logarithmic radio quantity unit - neper
    NEPER                   = 0x2786,
    /// Logarithmic radio quantity unit - bel
    BEL                     = 0x2787,
// ---- 0x2790
    // none yet.
// ---- 0x27A0
    /// Length unit - yard
    YARD                    = 0x27A0,
    /// Length unit - parsec (parallax second)
    PARSEC                  = 0x27A1,
    /// length unit - inch
    INCH                    = 0x27A2,
    /// length unit - foot
    FOOT                    = 0x27A3,
    /// length unit - mile
    MILE                    = 0x27A4,
    /// pressure unit - pound-force per square inch
    POUND_FORCE_PER_SQ_INCH = 0x27A5,
    /// velocity unit - kilometre per hour
    KM_PER_HOUR             = 0x27A6,
    /// velocity unit - mile per hour
    MILE_PER_HOUR           = 0x27A7,
    /// angular velocity unit - revolution per minute
    REVOLUTION_PER_MINUTE   = 0x27A8,
    /// energy unit - gram calorie
    GRAM_CALORIE            = 0x27A9,
    /// energy unit - kilogram calorie
    KG_CALORIE              = 0x27AA,
    ///  energy unit - kilowatt hour
    KW_HOUR                 = 0x27AB,
    /// thermodynamic temperature unit - degree Fahrenheit
    FAHRENHEIT              = 0x27AC,
    /// percentage
    PERCENTAGE              = 0x27AD,
    /// per mille
    PER_MILLE               = 0x27AE,
    /// period unit - beats per minute)
    BEATS_PER_MINUTE        = 0x27AF,
// ---- 0x27B0
    /// electric charge unit - ampere hours
    AMPERE_HOURS            = 0x27B0,
    /// mass density unit - milligram per decilitre
    MILLIGRAM_PER_DECI_LITRE    = 0x27B1,
    /// mass density unit - millimole per litre
    MILLIMOLE_PER_LITRE     = 0x27B2,
    /// time unit - year
    YEAR                    = 0x27B3,
    /// time unit - month
    MONTH                   = 0x27B4,
    /// concentration (count per cubic metre)
    COUNT_PER_CUBIC_METER   = 0x27B5,
    /// irradiance (watt per square metre)
    IRR_WATT_PER_SQ_METER    = 0x27B6,
    /// milliliter (per kilogram per minute)
    PER_KG_PER_MINUTE       = 0x27B7,
    /// mass (pound)
    POUND                   = 0x27B8,
    /// metabolic equivalent, no unit
    METABOLIC               = 0x27B9,
    /// step (per minute)
    STEP_PER_MINUTE         = 0x27BA,
    /// stroke (per minute)
    STROKE_PER_MINUTE       = 0x27BC,
    /// pace (kilometre per minute)
    KM_PER_MINUTE           = 0x27BD,
    /// luminous efficacy (lumen per watt)
    LUMEN_PER_WATT          = 0x27BE,
    /// luminous energy (lumen hour)
    LUMEN_HOUR              = 0x27BF,
    /// luminous exposure (lux hour)
    LUX_HOUR                = 0x27C0,
    /// mass flow (gram per second)
    GRAM_PER_SECOND         = 0x27C1,
    /// volume flow (litre per second)
    LITRE_PER_SECOND        = 0x27C2,
    /// sound pressure - decible: DB
    DECIBLE                 = 0x27C3,
    /// parts per million
    PARTS_PER_MILLION       = 0x27C4,
    /// parts per billion
    PARTS_PER_BILLION       = 0x27C5
}

export const enum DECL_UUID
{
    ///  Primary service Declaration
    PRIMARY_SERVICE         = 0x2800,
    ///  Secondary service Declaration
    SECONDARY_SERVICE       = 0x2801,
    ///  Include Declaration
    INCLUDE                 = 0x2802,
    ///  Characteristic Declaration
    CHARACTERISTIC          = 0x2803,
}

export const enum DESC_UUID
{
    ///  Characteristic extended properties
    CHAR_EXT_PROPERTIES     = 0x2900,
    ///  Characteristic user description
    CHAR_USER_DESCRIPTION   = 0x2901,
    ///  Client characteristic configuration
    CLIENT_CHAR_CFG         = 0x2902,
    ///  Server characteristic configuration
    SERVER_CHAR_CFG         = 0x2903,
    ///  Characteristic Presentation Format
    CHAR_PRES_FORMAT        = 0x2904,
    ///  Characteristic Aggregate Format
    CHAR_AGGREGATE_FORMAT   = 0x2905,
    ///  Valid Range
    VALID_RANGE             = 0x2906,
    ///  External Report Reference
    EXT_REPORT_REF          = 0x2907,
    ///  Report Reference
    REPORT_REF              = 0x2908,
}

export const enum CHAR_UUID
{
/*--------------- CHARACTERISTICS ---------------*/
    ///  Device name
    DEVICE_NAME             = 0x2A00,
    ///  Appearance
    APPEARANCE              = 0x2A01,
    ///  Privacy flag
    PRIVACY_FLAG            = 0x2A02,
    ///  Reconnection address
    RECONNECTION_ADDR       = 0x2A03,
    ///  Peripheral preferred connection parameters
    PERIPH_PREF_CON_PARAM   = 0x2A04,
    ///  Service handles changed
    SERVICE_CHANGED         = 0x2A05,
    ///  Alert Level characteristic
    ALERT_LEVEL             = 0x2A06,
    ///  Tx Power Level
    TX_POWER_LEVEL          = 0x2A07,
    ///  Date Time
    DATE_TIME               = 0x2A08,
    ///  Day of Week
    DAY_WEEK                = 0x2A09,
    ///  Day Date Time
    DAY_DATE_TIME           = 0x2A0A,
    /// Exact time 100
    EXACT_TIME_100          = 0x2A0B,
    ///  Exact time 256
    EXACT_TIME_256          = 0x2A0C,
    ///  DST Offset
    DST_OFFSET              = 0x2A0D,
    ///  Time zone
    TIME_ZONE               = 0x2A0E,
    ///  Local time Information
    LOCAL_TIME_INFO         = 0x2A0F,
// ------
    ///
    SECONDARY_TIME_ZONE     = 0x2A10,
    ///  Time with DST
    TIME_WITH_DST           = 0x2A11,
    ///  Time Accuracy
    TIME_ACCURACY           = 0x2A12,
    /// Time Source
    TIME_SOURCE             = 0x2A13,
    ///  Reference Time Information
    REFERENCE_TIME_INFO     = 0x2A14,
    ///  Time Update Control Point
    TIME_UPDATE_CNTL_POINT  = 0x2A16,
    ///  Time Update State
    TIME_UPDATE_STATE       = 0x2A17,
    ///  Glucose Measurement
    GLUCOSE_MEAS            = 0x2A18,
    ///  Battery Level
    BATTERY_LEVEL           = 0x2A19,
    /// Battery Power State.
    BATTERY_POWER_STATE     = 0x2A1A,
    /// Battery Level State.
    BATTERY_LEVEL_STATE     = 0x2A1B,
    ///  Temperature Measurement
    TEMPERATURE_MEAS        = 0x2A1C,
    ///  Temperature Type
    TEMPERATURE_TYPE        = 0x2A1D,
    ///  Intermediate Temperature
    INTERMED_TEMPERATURE    = 0x2A1E,
    /// Temperature Celsius
    TEMP_C                  = 0x2A1F,
// ------
    /// Temperature Fahrenheit.
    TEMP_F                  = 0x2A20,
    ///  Measurement Interval
    MEAS_INTERVAL           = 0x2A21,
    ///  Boot Keyboard Inpu t Report
    BOOT_KB_IN_REPORT       = 0x2A22,
    ///  System ID
    SYS_ID                  = 0x2A23,
    ///  Model Number String
    MODEL_NB                = 0x2A24,
    ///  Serial Number String
    SERIAL_NB               = 0x2A25,
    ///  Firmware Revision String
    FW_REV                  = 0x2A26,
    ///  Hardware revision String
    HW_REV                  = 0x2A27,
    ///  Software Revision String
    SW_REV                  = 0x2A28,
    ///  Manufacturer Name String
    MANUF_NAME              = 0x2A29,
    ///  IEEE Regulatory Certification Data List
    IEEE_CERTIF             = 0x2A2A,
    ///  CT Time
    CT_TIME                 = 0x2A2B,
    /// Elevation
    ELEVATION               = 0x2A2C,
    /// Latitude
    LATITUDE                = 0x2A2D,
    /// Longitude
    LONGITUDE               = 0x2A2E,
    /// Position 2D
    POSITION_2D             = 0x2A2F,
// ------
    /// Position 3D
    POSITION_3D             = 0x2A30,
    ///  Scan Refresh
    SCAN_REFRESH            = 0x2A31,
    ///  Boot Keyboard Output Report
    BOOT_KB_OUT_REPORT      = 0x2A32,
    ///  Boot Mouse Input Report
    BOOT_MOUSE_IN_REPORT    = 0x2A33,
    ///  Glucose Measurement Context
    GLUCOSE_MEAS_CTX        = 0x2A34,
    ///  Blood Pressure Measurement
    BLOOD_PRESSURE_MEAS     = 0x2A35,
    ///  Intermediate Cuff Pressure
    INTERMEDIATE_CUFF_PRESSURE = 0x2A36,
    ///  Heart Rate Measurement
    HEART_RATE_MEAS         = 0x2A37,
    ///  Body Sensor Location
    BODY_SENSOR_LOCATION    = 0x2A38,
    ///  Heart Rate Control Point
    HEART_RATE_CNTL_POINT   = 0x2A39,
    /// Removable
    REMOVABLE               = 0x2A3A,
    /// Service Required
    SERVICE_REQ             = 0x2A3B,
    /// Scientific Temperature in Celsius
    SCI_TEMP_C              = 0x2A3C,
    /// String
    STRING                  = 0x2A3D,
    /// Network Availability
    NETWORK_AVAIL           = 0x2A3E,
        ///  Alert Status
    ALERT_STATUS            = 0x2A3F,
// ------
    ///  Ringer Control Point
    RINGER_CNTL_POINT       = 0x2A40,
    ///  Ringer Setting
    RINGER_SETTING          = 0x2A41,
    ///  Alert Category ID Bit Mask
    ALERT_CAT_ID_BIT_MASK   = 0x2A42,
    ///  Alert Category ID
    ALERT_CAT_ID            = 0x2A43,
    ///  Alert Notification Control Point
    ALERT_NTF_CTNL_PT       = 0x2A44,
    ///  Unread Alert Status
    UNREAD_ALERT_STATUS     = 0x2A45,
    ///  New Alert
    NEW_ALERT               = 0x2A46,
    ///  Supported New Alert Category
    SUP_NEW_ALERT_CAT       = 0x2A47,
    ///  Supported Unread Alert Category
    SUP_UNREAD_ALERT_CAT    = 0x2A48,
    ///  Blood Pressure Feature
    BLOOD_PRESSURE_FEATURE  = 0x2A49,
    ///  HID Information
    HID_INFO                = 0x2A4A,
    ///  Report Map
    REPORT_MAP              = 0x2A4B,
    ///  HID Control Point
    HID_CTNL_PT             = 0x2A4C,
    ///  Report
    REPORT                  = 0x2A4D,
    ///  Protocol Mode
    PROTOCOL_MODE           = 0x2A4E,
    ///  Scan Interval Window
    SCAN_INTV_WD            = 0x2A4F,
// ------
    ///  PnP ID
    PNP_ID                  = 0x2A50,
    ///  Glucose Feature
    GLUCOSE_FEATURE         = 0x2A51,
    ///  Record access control poin
    RACP                    = 0x2A52,
    /// Running Speed Measurement
    RUNNING_SPEED_MEASUREMENT = 0x2A53,
    ///  Running Speed Feature
    RUNNING_SPEED_FEATURE   = 0x2A54,
    ///  Cycling Speed Measurement
    CYCLING_SPEED_MEASUREMENT = 0x2A5B,
    ///  Cycling Speed Feature
    CYCLING_SPEED_FEATURE   = 0x2A5C,
    ///  Sensor Location
    SENSOR_LOCATION         = 0x2A5D,
    /// Pulse Oximeter Features
    PULSE_OX_SPOT_CHECK     = 0x2A5E,
    /// Pulse Oximeter Features
    PULSE_OX_CONTINUOUS     = 0x2A5F,
// ------
    /// Pulse Oximeter Features.
    PULSE_OX_FEATURES       = 0x2A60,
    /// Cycling Power Measurement.
    CYCLING_POWER_MEASUREMENT = 0x2A63,
    /// Cycling Power Feature.
    CYCLING_POWER_FEATURE   = 0x2A65,
// ------
    /// Database Change Increment.
    DB_CHANGE_INCREMENT     = 0x2A99,
    /// User Index
    USER_INDEX              = 0x2A9A,
    /// Weight Measurement
    WEIGHT_MEAS             = 0x2A9D,
    /// Weight Scale Feature
    WEIGHT_SCALE_FEATURE    = 0x2A9E,
    /// User Control Point
    USER_CONTROL_POINT      = 0x2A9F,
// ------
    /// Resolvable Prviate Address Only
    RPAO                    = 0x2AC9,
    /// Mesh Provisioning Data In
    MESH_PRV_DATA_IN        = 0x2ADB,
    // Mesh Provisioning Data Out
    MESH_PRV_DATA_OUT       = 0x2ADC,
    /// Mesh Proxy Data In
    MESH_PROXY_DATA_IN      = 0x2ADD,
    /// Mesh Proxy Data Out
    MESH_PROXY_DATA_OUT     = 0x2ADE,
// ------
    /// Client Supported Features
    CLIENT_SUPPORTED_FEATURES = 0x2B29,
    /// Database Hash
    DATABASE_HASH           = 0x2B2A,
    /// Server Supported Features
    SERVER_SUPPORTED_FEATURES = 0x2B3A,
// ------
    // Constant Tone Extension enable
    CTE_ENABLE              = 0x7F80,
    /// Constant Tone Extension minimum length
    CTE_MIN_LEN             = 0x7F81,
    /// Constant Tone Extension transmit count
    CTE_TX_CNT              = 0x7F82,
    /// Constant Tone Extension transmit duration
    CTE_TX_DURATION         = 0x7F83,
    /// Constant Tone Extension interval
    CTE_INTERVAL            = 0x7F84,
    /// Constant Tone Extension PHY
    CTE_PHY                 = 0x7F85,
}

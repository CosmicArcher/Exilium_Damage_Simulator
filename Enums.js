const AttackTypes = {
    TARGETED: "Targeted",
    AOE: "AoE"
}

const Elements = {
    PHYSICAL: "Physical",
    FREEZE: "Freeze",
    BURN: "Burn",
    CORROSION: "Corrosion",
    HYDRO: "Hydro",
    ELECTRIC: "Electric"
}

const AmmoTypes = {
    LIGHT: "Light",
    MEDIUM: "Medium",
    HEAVY: "Heavy",
    MELEE: "Melee",
    SHOTGUN: "Shotgun",
    NONE: "None"
}

const SkillJSONKeys = {
    TYPE: "Type",
    MULTIPLIER: "Multiplier",
    CRIT_MODIFIER: "Crit_Modifier",
    CRIT_DAMAGE_MODIFIER: "Crit_Damage_Modifier",
    FIXED_DAMAGE: "Fixed_Damage",
    DAMAGE_TYPE: "Damage_Type",
    MELEE: "Melee",
    COVER_IGNORE: "Cover_Ignore",
    STABILITYDAMAGE: "StabilityDamage",
    AMMO_TYPE: "Ammo_Type",
    ELEMENT: "Element",
    PRE_TARGET_BUFF: "Pre_Target_Buff",
    PRE_SELF_BUFF: "Pre_Self_Buff",
    PRE_SUPPORT_BUFF: "Pre_Support_Buff",
    POST_TARGET_BUFF: "Post_Target_Buff",
    POST_SELF_BUFF: "Post_Self_Buff",
    POST_SUPPORT_BUFF: "Post_Support_Buff",
    CONDITIONAL: "Conditional",
    EXTRA_ATTACK: "Extra_Attack"
}

const SkillNames = {
    BASIC: "Basic",
    SKILL2: "Skill2",
    SKILL3: "Skill3",
    ULT: "Ultimate",
    SUPPORT: "Support"
}

const CalculationTypes = {
    EXPECTED: "Expected",
    CRIT: "Crit",
    NOCRIT: "NoCrit",
    SIMULATION: "Simulation"
}

export {AttackTypes, Elements, AmmoTypes, SkillJSONKeys, SkillNames, CalculationTypes};
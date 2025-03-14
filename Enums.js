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
    TYPE: "Type", // Attack, Buff
    MULTIPLIER: "Multiplier", // float
    CRIT_MODIFIER: "Crit_Modifier", // float
    CRIT_DAMAGE_MODIFIER: "Crit_Damage_Modifier", // float
    FIXED_DAMAGE: "Fixed_Damage", // object
    FIXED_DAMAGE_SCALING: "Scaling", // float
    FIXED_DAMAGE_STAT: "Stat", // Attack, Defense
    DAMAGE_TYPE: "Damage_Type", // Targeted, AoE
    COVER_IGNORE: "Cover_Ignore", // float
    STABILITYDAMAGE: "StabilityDamage", // int
    AMMO_TYPE: "Ammo_Type", // None, Light, Medium, Heavy, Shotgun, Melee
    ELEMENT: "Element", // Physical, Freeze, Burn, Corrosion, Hydro, Electric
    PRE_TARGET_BUFF: "Pre_Target_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    PRE_SELF_BUFF: "Pre_Self_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    PRE_SUPPORT_BUFF: "Pre_Support_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    POST_TARGET_BUFF: "Post_Target_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    POST_SELF_BUFF: "Post_Self_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    POST_SUPPORT_BUFF: "Post_Support_Buff", // object array [{Name, (Duration, Stacks)...},{}...]
    BUFF_TARGET: "Target", // Self, Ally, All
    BUFF_NAME: "Name", // string
    BUFF_DURATION: "Duration", // int
    BUFF_STACKS: "Stacks", // int
    CONDITIONAL: "Conditional", // {skill keys to override}
    EXTRA_ATTACK: "Extra_Attack", // object with same keys as other Attack-type objects
    CONDITIONAL_APPEND: "Append", // key exists if appending to buff list rather than overwriting when condition is met
    DAMAGE_BOOST: "Damage_Boost" // float, corresponds to additional doll damage dealt %
}

const SkillNames = {
    BASIC: "Basic",
    SKILL2: "Skill2",
    SKILL3: "Skill3",
    ULT: "Ultimate",
    SUPPORT: "Support",
    INTERCEPT: "Intercept",
    COUNTERATTACK: "CounterAttack"
}

const CalculationTypes = {
    EXPECTED: "Expected",
    CRIT: "Crit",
    NOCRIT: "NoCrit",
    SIMULATION: "Simulation"
}

export {AttackTypes, Elements, AmmoTypes, SkillJSONKeys, SkillNames, CalculationTypes};
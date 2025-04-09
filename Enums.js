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
    COOLDOWN: "Cooldown", // int, present if skill has a cooldown
    COST: "Cost", // int, present if the skill costs index
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
    CONDITIONAL: "Conditional", // Array of objects {info text, skill keys to override}
    CONDITION_TEXT: "Condition_Text", // string to display to inform what the condition is
    EXTRA_ATTACK: "Extra_Attack", // object with same keys as other Attack-type objects
    APPEND: "Append", // key exists if appending to buff or conditional list rather than overwriting
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
    EXPECTED: "ExpectedValue",
    CRIT: "Crit",
    NOCRIT: "NoCrit",
    SIMULATION: "Random"
}

const BuffJSONKeys = {
    BUFF_TYPE : "Buff_Type", // string
    TURN_BASED : "Turn_Based", // bool, whether duration is reduced per endTurn() called
    CONSUMPTION_MODE : "Consumption_Mode", // stack consumption mode, Attack, AllAttack, Defense, None
    CLEANSEABLE : "Cleanseable", // bool, whether "cleanse" can remove the buff
    ELEMENT : "Element", // element of the buff for certain interactions
    STAT : "Stat", // which stat the buff is classified as, movement, attack, defense, etc.
    STACKABLE : "Stackable", // whether the buff can stack with itself and compound the effects
    STACK_LIMIT : "Stack_Limit", // maximum number of stacks the unit can have, is not necessarily used in conjunction with "stackable"
    ATTACK_PERC : "Attack_Perc",
    DEFENSE_PERC : "Defense_Perc",
    STABILITY_TAKEN : "Stability_Taken",
    DAMAGE_PERC : "Damage_Perc",
    SUPPORT_PERC : "Support_Perc",
    EXPOSED_PERC : "Exposed_Perc",
    CRIT_RATE : "Crit",
    CRIT_DAMAGE : "Crit_Damage",
    DAMAGE_TAKEN : "Damage_Taken",
    STABILITY_DAMAGE : "Stability_Damage",
    DEFENSE_IGNORE : "Defense_Ignore",
    AOE_DAMAGE_TAKEN : "AoE_Damage_Taken",
    TARGETED_DAMAGE_TAKEN : "Targeted_Damage_Taken",
    PHASE_DAMAGE : "Phase_Damage",
    ELEMENTAL_DAMAGE : "Elemental_Damage" // elemental damage buffs, value is an object where key is the element and value is the amount of damage increase
}

export {AttackTypes, Elements, AmmoTypes, SkillJSONKeys, SkillNames, CalculationTypes, BuffJSONKeys};
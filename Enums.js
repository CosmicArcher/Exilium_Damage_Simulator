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
    CONSUMPTION_MODE : "Consumption_Mode", // stack consumption mode, Attack, AllAttack, ActiveAttack, Support, Defense, None
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
    ELEMENTAL_DAMAGE : "Elemental_Damage" // elemental damage buffs, value is an array where 0 index is the element and 1 index is the amount of damage increase
}

const WeaponJSONKeys = {
    TYPE : "Type", // string, which gun type they belong to. AR, SMG, etc. will be used later to limit gun options according to doll
    TRAIT : "Trait", // string, 
    PASSIVE : "Passive",  // object containing the permanent stat buffs
    GLOBAL : "Global", // object containing global non-stacking buff name
    ON_MOVE : "On_Move", // object containing stat buffs if unit moved, assumed true for non support attacks
    STEPS : "Steps", // int, number of steps needed to trigger on_move effects, assumed max steps are always done
    NO_MOVE : "No_Move", // object containing stat buffs if unit has not moved, assumed always true in proper play
    OUT_OF_COVER : "Out_of_Cover", // object containing stat buffs if target has 0% cover damage reduction
    PHASE_EXPLOIT : "Phase_Exploit", // object containing stat buffs if any weaknesses are exploited
    EXPLOIT_ELEMENT : "Element", // array containing the exploited element for bonus effects in index 0 and index 1 contains an array of the bonus values
    ELEMENTAL_DEBUFF : "Elemental_Debuff", // object containing stat buffs if target has debuff of element type
    DEBUFF_ELEMENT : "Element", // element that triggers elemental debuff bonus
    ON_INSIGHT : "On_Insight", // object containing stat buffs if insight is present
    AOE_CORROSION : "AoE_Corrosion", // array for cluckay gun damage passive which is extremely specific on the damage type boosted
    ELEMENTAL_DAMAGE : "Elemental_Damage", // array for elemental damage, same format as buff elemental_damage but the 1 index can be array if scaling with calib
    DAMAGE_PERC : "Damage_Perc",  // array for damage increase, each index corresponds to a calibration level
    PHASE_DAMAGE : "Phase_Damage", // array for phase damage, same format as above
    CRIT_DAMAGE : "Crit_Damage", // array for crit damage, same format as above
    DEFENSE_IGNORE : "Defense_Ignore", // array for defense ignore, same format as above
    STABILITY_IGNORE : "Stability_Ignore", // array for stability ignore, same format as above
    BUFF : "Buff", // object, buffs that are applied after a condition, condition checks are hardcoded into the doll class, same format as skill buff objects
    BUFF_TARGET : "Target", // self or (enemy) target, buff target
    BUFF_NAME : "Name", // name of buff, full name is assembled with this and the calibration as stack limit and buff amount can improve as gun calibration increases
    BUFF_STACKS : "Stacks" // array as certain guns apply more stacks as calib increases
}

export {AttackTypes, Elements, AmmoTypes, SkillJSONKeys, SkillNames, CalculationTypes, BuffJSONKeys, WeaponJSONKeys};
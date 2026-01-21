"use strict";
// Enums for the application
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetType = exports.TrainingLevel = exports.MuscleGroupName = void 0;
var MuscleGroupName;
(function (MuscleGroupName) {
    MuscleGroupName["Back"] = "Plecy";
    MuscleGroupName["Biceps"] = "Biceps";
    MuscleGroupName["Calves"] = "\u0141ydki";
    MuscleGroupName["Chest"] = "Klata";
    MuscleGroupName["Core"] = "Core";
    MuscleGroupName["Forearms"] = "Przedramiona";
    MuscleGroupName["FullBody"] = "Full Body";
    MuscleGroupName["Glutes"] = "Po\u015Bladki";
    MuscleGroupName["Hamstrings"] = "Dwug\u0142owe uda";
    MuscleGroupName["LowerBack"] = "Lower Back";
    MuscleGroupName["Quads"] = "Quads";
    MuscleGroupName["RearDelts"] = "Rear Delts";
    MuscleGroupName["Shoulders"] = "Shoulders";
    MuscleGroupName["AnteriorTibialis"] = "Anterior Tibialis";
    MuscleGroupName["Traps"] = "Traps";
    MuscleGroupName["Triceps"] = "Triceps";
    MuscleGroupName["Adductors"] = "Adductors";
    MuscleGroupName["Hips"] = "Hips";
    MuscleGroupName["Abductors"] = "Abductors";
})(MuscleGroupName || (exports.MuscleGroupName = MuscleGroupName = {}));
var TrainingLevel;
(function (TrainingLevel) {
    TrainingLevel["Beginner"] = "beginner";
    TrainingLevel["Intermediate"] = "intermediate";
    TrainingLevel["Advanced"] = "advanced";
})(TrainingLevel || (exports.TrainingLevel = TrainingLevel = {}));
var SetType;
(function (SetType) {
    SetType["BackOffSet"] = "Back-off set";
    SetType["WorkingSet"] = "Working set";
    SetType["WarmUpSet"] = "Warm-up set";
    SetType["DropSet"] = "Drop set";
    SetType["FailureSet"] = "Failure set";
})(SetType || (exports.SetType = SetType = {}));

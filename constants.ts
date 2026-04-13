import { Unit, UnitData, FRQType } from './types';

export const FRQ_POINT_TOTALS: Record<FRQType, number> = {
  [FRQType.MR]: 10,
  [FRQType.TBR]: 12,
  [FRQType.LAB]: 10,
  [FRQType.QQT]: 8
};

export const UNITS: UnitData[] = [
  {
    id: Unit.Kinematics,
    name: "Unit 1: Kinematics",
    subTopics: [
      { id: "1.1", name: "Scalars and Vectors" },
      { id: "1.2", name: "Displacement, Velocity, and Acceleration" },
      { id: "1.3", name: "Representing Motion" },
      { id: "1.4", name: "Reference Frames and Relative Motion" },
      { id: "1.5", name: "Motion in Two or Three Dimensions" }
    ]
  },
  {
    id: Unit.Dynamics,
    name: "Unit 2: Force and Translational Dynamics",
    subTopics: [
      { id: "2.1", name: "Systems and Center of Mass" },
      { id: "2.2", name: "Forces and Free-Body Diagrams" },
      { id: "2.3", name: "Newton's Third Law" },
      { id: "2.4", name: "Newton's First Law" },
      { id: "2.5", name: "Newton's Second Law" },
      { id: "2.6", name: "Gravitational Force" },
      { id: "2.7", name: "Kinetic and Static Friction" },
      { id: "2.8", name: "Spring Forces" },
      { id: "2.9", name: "Resistive Forces" },
      { id: "2.10", name: "Circular Motion" }
    ]
  },
  {
    id: Unit.WorkEnergy,
    name: "Unit 3: Work, Energy, and Power",
    subTopics: [
      { id: "3.1", name: "Translational Kinetic Energy" },
      { id: "3.2", name: "Work" },
      { id: "3.3", name: "Potential Energy" },
      { id: "3.4", name: "Conservation of Energy" },
      { id: "3.5", name: "Power" }
    ]
  },
  {
    id: Unit.Momentum,
    name: "Unit 4: Linear Momentum",
    subTopics: [
      { id: "4.1", name: "Linear Momentum" },
      { id: "4.2", name: "Change in Momentum and Impulse" },
      { id: "4.3", name: "Conservation of Linear Momentum" },
      { id: "4.4", name: "Elastic and Inelastic Collisions" }
    ]
  },
  {
    id: Unit.Rotation,
    name: "Unit 5: Torque and Rotational Dynamics",
    subTopics: [
      { id: "5.1", name: "Rotational Kinematics" },
      { id: "5.2", name: "Connecting Linear and Rotational Motion" },
      { id: "5.3", name: "Torque" },
      { id: "5.4", name: "Rotational Inertia" },
      { id: "5.5", name: "Rotational Equilibrium" },
      { id: "5.6", name: "Newton's Second Law in Rotational Form" }
    ]
  },
  {
    id: Unit.Rolling,
    name: "Unit 6: Energy and Momentum of Rotating Systems",
    subTopics: [
      { id: "6.1", name: "Rotational Kinetic Energy" },
      { id: "6.2", name: "Torque and Work" },
      { id: "6.3", name: "Angular Momentum and Angular Impulse" },
      { id: "6.4", name: "Conservation of Angular Momentum" },
      { id: "6.5", name: "Rolling" },
      { id: "6.6", name: "Motion of Orbiting Satellites" }
    ]
  },
  {
    id: Unit.Oscillations,
    name: "Unit 7: Oscillations",
    subTopics: [
      { id: "7.1", name: "Defining SHM" },
      { id: "7.2", name: "Frequency and Period of SHM" },
      { id: "7.3", name: "Representing and Analyzing SHM" },
      { id: "7.4", name: "Energy of Simple Harmonic Oscillators" },
      { id: "7.5", name: "Simple and Physical Pendulums" }
    ]
  }
];

export const FRQ_TYPES = [
  { id: FRQType.MR, name: "Mathematical Routines (MR)", desc: "Use mathematics to analyze a scenario and make predictions." },
  { id: FRQType.TBR, name: "Translation Between Representations (TBR)", desc: "Connect different representations (graphs, equations, diagrams) of a scenario." },
  { id: FRQType.LAB, name: "Experimental Design and Analysis (LAB)", desc: "Design experiments and analyze data to determine physical quantities." },
  { id: FRQType.QQT, name: "Qualitative/Quantitative Translation (QQT)", desc: "Connect qualitative reasoning with quantitative analysis." }
];
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Material, calculateMaterial, MaterialCalculation } from './materials';

const STORAGE_KEY = '@truss_projects';

export interface Project {
  id: string;
  name: string;
  calculations: MaterialCalculation[];
  createdAt: number;
  updatedAt: number;
}

// Serialize — calculations contain Material objects which need to be rehydrated
interface SerializedCalc {
  materialId: string;
  quantity: number;
  wastePercent: number;
}

interface SerializedProject {
  id: string;
  name: string;
  calcs: SerializedCalc[];
  createdAt: number;
  updatedAt: number;
}

function serializeCalc(calc: MaterialCalculation): SerializedCalc {
  return {
    materialId: calc.material.id,
    quantity: calc.quantity,
    wastePercent: calc.wastePercent,
  };
}

function deserializeCalc(s: SerializedCalc): MaterialCalculation | null {
  const material = materialsById[s.materialId];
  if (!material) return null;
  return calculateMaterial(material, s.quantity, s.wastePercent);
}

// Build lookup table
const materialsById: { [id: string]: Material } = {};
// This runs after import — materials.ts exports the array
import { materials as materialsArray } from './materials';
materialsArray.forEach((m) => { materialsById[m.id] = m; });

export async function loadProjects(): Promise<Project[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const serialized: SerializedProject[] = JSON.parse(raw);
    return serialized.map((s) => ({
      id: s.id,
      name: s.name,
      calculations: s.calcs
        .map(deserializeCalc)
        .filter((c): c is MaterialCalculation => c !== null),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  try {
    const serialized: SerializedProject[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      calcs: p.calculations.map(serializeCalc),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

export async function saveProject(project: Project): Promise<Project[]> {
  const projects = await loadProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  project.updatedAt = Date.now();
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
  }
  await saveProjects(projects);
  return projects;
}

export async function deleteProject(id: string): Promise<Project[]> {
  const projects = await loadProjects();
  const filtered = projects.filter((p) => p.id !== id);
  await saveProjects(filtered);
  return filtered;
}

export async function renameProject(id: string, name: string): Promise<Project[]> {
  const projects = await loadProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx >= 0) {
    projects[idx].name = name;
    projects[idx].updatedAt = Date.now();
    await saveProjects(projects);
  }
  return projects;
}

export function createProject(name: string): Project {
  const now = Date.now();
  return {
    id: `proj_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    calculations: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

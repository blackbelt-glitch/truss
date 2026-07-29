// Material database — baseline prices from public retail (Home Depot/Lowe's avg)
// Users override with their supplier's actual prices in-app
export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string; // 'sq ft', 'linear ft', 'each', 'bag'
  coveragePerBox?: number; // sq ft per box
  pricePerBox?: number;
  pricePerUnit?: number;
  defaultWaste: number; // percentage added
  icon: string; // emoji for now
}

export const materials: Material[] = [
  {
    id: 'hardwood-oak',
    name: 'Hardwood Flooring',
    category: 'Flooring',
    unit: 'sq ft',
    coveragePerBox: 20,
    pricePerBox: 89.00,
    defaultWaste: 10,
    icon: '🪵',
  },
  {
    id: 'tile-porcelain-12x24',
    name: 'Porcelain Tile',
    category: 'Flooring',
    unit: 'sq ft',
    coveragePerBox: 16,
    pricePerBox: 124.00,
    defaultWaste: 10,
    icon: '⬜',
  },
  {
    id: 'tile-ceramic-12x12',
    name: 'Ceramic Tile',
    category: 'Flooring',
    unit: 'sq ft',
    coveragePerBox: 10,
    pricePerBox: 54.00,
    defaultWaste: 10,
    icon: '⬜',
  },
  {
    id: 'laminate-flooring',
    name: 'Laminate Flooring',
    category: 'Flooring',
    unit: 'sq ft',
    coveragePerBox: 20,
    pricePerBox: 49.00,
    defaultWaste: 10,
    icon: '🪵',
  },
  {
    id: 'vinyl-plank',
    name: 'Vinyl Plank Flooring',
    category: 'Flooring',
    unit: 'sq ft',
    coveragePerBox: 24,
    pricePerBox: 64.00,
    defaultWaste: 10,
    icon: '🪵',
  },
  {
    id: 'carpet',
    name: 'Carpet',
    category: 'Flooring',
    unit: 'sq ft',
    pricePerUnit: 3.50,
    defaultWaste: 10,
    icon: '🟫',
  },
  {
    id: 'paint-interior',
    name: 'Interior Paint',
    category: 'Paint',
    unit: 'sq ft',
    coveragePerBox: 400, // 1 gallon covers ~400 sq ft
    pricePerBox: 45.00,
    defaultWaste: 5,
    icon: '🎨',
  },
  {
    id: 'paint-primer',
    name: 'Primer',
    category: 'Paint',
    unit: 'sq ft',
    coveragePerBox: 350,
    pricePerBox: 35.00,
    defaultWaste: 5,
    icon: '🎨',
  },
  {
    id: 'concrete-bag',
    name: 'Concrete (60lb bags)',
    category: 'Concrete',
    unit: 'cubic ft',
    coveragePerBox: 0.45, // 1 bag = 0.45 cu ft
    pricePerBox: 5.50,
    defaultWaste: 5,
    icon: '🪨',
  },
  {
    id: 'drywall-4x8',
    name: 'Drywall 4×8 Sheet',
    category: 'Drywall',
    unit: 'sq ft',
    coveragePerBox: 32, // 4x8 = 32 sq ft
    pricePerBox: 12.00,
    defaultWaste: 10,
    icon: '🟦',
  },
  {
    id: 'roofing-bundle',
    name: 'Roofing Shingles (Bundle)',
    category: 'Roofing',
    unit: 'sq ft',
    coveragePerBox: 33, // 1 bundle covers ~33 sq ft (1/3 of a square)
    pricePerBox: 37.00,
    defaultWaste: 12,
    icon: '🏠',
  },
  {
    id: 'baseboard-mdf',
    name: 'Baseboard MDF',
    category: 'Trim',
    unit: 'linear ft',
    pricePerUnit: 1.20,
    defaultWaste: 10,
    icon: '📏',
  },
  {
    id: 'lumber-2x4',
    name: '2×4 Lumber (8ft)',
    category: 'Lumber',
    unit: 'each',
    pricePerUnit: 4.50,
    defaultWaste: 5,
    icon: '🪵',
  },
  {
    id: 'lumber-2x6',
    name: '2×6 Lumber (8ft)',
    category: 'Lumber',
    unit: 'each',
    pricePerUnit: 7.25,
    defaultWaste: 5,
    icon: '🪵',
  },
  {
    id: 'plywood-4x8',
    name: 'Plywood 4×8 Sheet',
    category: 'Lumber',
    unit: 'sq ft',
    coveragePerBox: 32,
    pricePerBox: 35.00,
    defaultWaste: 10,
    icon: '🟫',
  },
  {
    id: 'insulation-r13',
    name: 'Insulation R-13 (Batt)',
    category: 'Insulation',
    unit: 'sq ft',
    coveragePerBox: 40,
    pricePerBox: 28.00,
    defaultWaste: 5,
    icon: '🧊',
  },
  {
    id: 'grout-sanded',
    name: 'Sanded Grout (25lb bag)',
    category: 'Tile',
    unit: 'sq ft',
    coveragePerBox: 150,
    pricePerBox: 22.00,
    defaultWaste: 5,
    icon: '⬜',
  },
  {
    id: 'thinset-modified',
    name: 'Thinset Mortar (50lb bag)',
    category: 'Tile',
    unit: 'sq ft',
    coveragePerBox: 75,
    pricePerBox: 30.00,
    defaultWaste: 5,
    icon: '🪨',
  },
];

// Calculate material quantities and cost
export interface MaterialCalculation {
  material: Material;
  quantity: number;
  wastePercent: number;
  boxesNeeded: number;
  totalUnits: number;
  subtotal: number;
  customName?: string;
  /** Supplier price entered by the user, overriding the catalog price for this line item. */
  customPrice?: number;
}

/** The price actually used for a line item — the user's own price if they set one. */
export function effectivePrice(calc: MaterialCalculation): number {
  return calc.customPrice ?? calc.material.pricePerBox ?? calc.material.pricePerUnit ?? 0;
}

export function calculateMaterial(
  material: Material,
  quantity: number,
  wastePercent: number = material.defaultWaste,
  customPrice?: number
): MaterialCalculation {
  const totalUnits = quantity * (1 + wastePercent / 100);
  
  if (material.coveragePerBox && material.pricePerBox) {
    const boxesNeeded = Math.ceil(totalUnits / material.coveragePerBox);
    const price = customPrice ?? material.pricePerBox;
    const subtotal = boxesNeeded * price;
    return {
      material,
      quantity,
      wastePercent,
      boxesNeeded,
      totalUnits,
      subtotal,
      customPrice,
    };
  }
  
  // Price per unit (linear ft, each)
  const price = customPrice ?? material.pricePerUnit ?? 0;
  const piecesNeeded = Math.ceil(totalUnits);
  const subtotal = piecesNeeded * price;
  return {
    material,
    quantity,
    wastePercent,
    boxesNeeded: piecesNeeded,
    totalUnits,
    subtotal,
    customPrice,
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse fractions (contractors think in 3/8", not 0.375)
export function parseFraction(input: string): number {
  const trimmed = input.trim();
  
  // Try "3/8" format
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }
  
  // Try "3 1/2" format (whole + fraction)
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }
  
  // Try decimal
  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal)) return decimal;
  
  return 0;
}

// Convert decimal to fraction for display
export function decimalToFraction(decimal: number): string {
  if (decimal === 0) return '0';
  
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;
  
  if (remainder === 0) return whole.toString();
  
  // Common fractions contractors use
  const commonFractions: { [key: string]: string } = {
    '0.0625': '1/16',
    '0.125': '1/8',
    '0.1875': '3/16',
    '0.25': '1/4',
    '0.3125': '5/16',
    '0.375': '3/8',
    '0.4375': '7/16',
    '0.5': '1/2',
    '0.5625': '9/16',
    '0.625': '5/8',
    '0.6875': '11/16',
    '0.75': '3/4',
    '0.8125': '13/16',
    '0.875': '7/8',
    '0.9375': '15/16',
  };
  
  const key = remainder.toFixed(4);
  const fraction = commonFractions[key];
  
  if (fraction) {
    return whole > 0 ? `${whole} ${fraction}` : fraction;
  }
  
  // Fallback to decimal
  return decimal.toFixed(3).replace(/\.?0+$/, '');
}

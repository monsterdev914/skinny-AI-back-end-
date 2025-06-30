import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D, Image, ImageData } from 'canvas';

// Skin region interface with polygon support
export interface SkinRegion {
  id: string;
  bodyPart: 'face' | 'neck' | 'arm' | 'hand' | 'torso' | 'leg' | 'foot' | 'unknown';
  polygon: Point[];
  boundingBox: BoundingBox;
  area: number; // pixel count
  confidence: number;
  centerPoint: Point;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SkinDetectionResult {
  success: boolean;
  regions: SkinRegion[];
  totalSkinArea: number;
  totalImageArea: number;
  skinCoveragePercentage: number;
  visibleSkinAreas: {
    face?: boolean;
    arms?: boolean;
    hands?: boolean;
    legs?: boolean;
    torso?: boolean;
    neck?: boolean;
  };
  message: string;
}

export class SkinDetectionService {
  private isInitialized = false;

  constructor() {
    this.isInitialized = true;
  }

  // Main skin detection function for server-side processing
  async detectSkinAreas(imageBuffer: Buffer): Promise<SkinDetectionResult> {
    try {
      // Load image from buffer using canvas
      const image = await loadImage(imageBuffer);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      // Draw image to canvas
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);

      // For now, create a simple person mask (full image as person)
      // TODO: Integrate MediaPipe for proper person segmentation
      const personMask = this.createSimplePersonMask(image.width, image.height);
      
      // Detect skin areas within person mask
      const skinMask = this.detectSkinPixels(imageData, personMask, image.width, image.height);
      
      // Find connected skin regions
      const regions = this.findSkinRegions(skinMask, image.width, image.height);
      
      // Calculate statistics
      const totalSkinArea = regions.reduce((sum, region) => sum + region.area, 0);
      const totalImageArea = image.width * image.height;
      const skinCoveragePercentage = (totalSkinArea / totalImageArea) * 100;

      // Determine visible skin areas
      const visibleSkinAreas = this.determineVisibleSkinAreas(regions);

      return {
        success: true,
        regions,
        totalSkinArea,
        totalImageArea,
        skinCoveragePercentage,
        visibleSkinAreas,
        message: `Detected ${regions.length} skin regions covering ${skinCoveragePercentage.toFixed(1)}% of image`
      };

    } catch (error) {
      console.error('Backend skin detection error:', error);
      return {
        success: false,
        regions: [],
        totalSkinArea: 0,
        totalImageArea: 0,
        skinCoveragePercentage: 0,
        visibleSkinAreas: {},
        message: `Skin detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Create a simple person mask (for now, until MediaPipe integration)
  private createSimplePersonMask(width: number, height: number): ImageData {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    const mask = ctx.createImageData(width, height);
    
    // Set all pixels as person pixels (simple approach)
    for (let i = 0; i < mask.data.length; i += 4) {
      mask.data[i] = 255;     // R
      mask.data[i + 1] = 255; // G
      mask.data[i + 2] = 255; // B
      mask.data[i + 3] = 255; // A
    }
    
    return mask;
  }

  // Detect skin pixels using HSV color space filtering with position logic
  private detectSkinPixels(imageData: ImageData, personMask: ImageData, width: number, height: number): ImageData {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const skinMask = ctx.createImageData(width, height);
    
    const pixels = imageData.data;
    const maskPixels = personMask.data;
    const skinPixels = skinMask.data;

    for (let i = 0; i < pixels.length; i += 4) {
      // Only process pixels that are part of the person
      if (maskPixels[i]! > 128) { // Person mask threshold
        const r = pixels[i]!;
        const g = pixels[i + 1]!;
        const b = pixels[i + 2]!;
        
        // Get pixel position for position-based logic
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        if (this.isSkinColor(r, g, b, x, y, width, height)) {
          skinPixels[i] = 255;     // R
          skinPixels[i + 1] = 255; // G
          skinPixels[i + 2] = 255; // B
          skinPixels[i + 3] = 255; // A
        }
      }
    }

    return skinMask;
  }

  // Skin color detection using HSV color space with hair exclusion and position logic
  private isSkinColor(r: number, g: number, b: number, x: number, y: number, width: number, height: number): boolean {
    // Convert RGB to HSV
    const { h, s, v } = this.rgbToHsv(r, g, b);
    
    // Position-based hair exclusion - top 40% of image is likely hair
    const relativeY = y / height;
    const relativeX = x / width;
    
    // VERY aggressive exclusion in top region
    if (relativeY < 0.4) {
      // Exclude almost everything in top 40% that could be hair
      const avgBrightness = (r + g + b) / 3;
      if (avgBrightness < 150 || this.isProbablyHairByPosition(h, s, v, r, g, b)) {
        return false;
      }
    }
    
    // Additional exclusion in top-center where hair parting occurs
    if (relativeY < 0.5 && relativeX > 0.3 && relativeX < 0.7) {
      const avgBrightness = (r + g + b) / 3;
      if (avgBrightness < 140) {
        return false;
      }
    }
    
    // Exclude obvious hair colors everywhere
    if (this.isHairColor(h, s, v)) {
      return false;
    }
    
    // Balanced skin color ranges - detect skin but avoid hair
    const skinRanges = [
      // Very light skin tones
      { hMin: 0, hMax: 15, sMin: 0.1, sMax: 0.6, vMin: 0.6, vMax: 1.0 },
      // Light skin tones  
      { hMin: 5, hMax: 25, sMin: 0.15, sMax: 0.7, vMin: 0.5, vMax: 0.9 },
      // Medium skin tones
      { hMin: 10, hMax: 30, sMin: 0.2, sMax: 0.75, vMin: 0.4, vMax: 0.85 },
      // Darker skin tones
      { hMin: 15, hMax: 35, sMin: 0.15, sMax: 0.7, vMin: 0.25, vMax: 0.75 },
      // Reddish skin tones
      { hMin: 340, hMax: 360, sMin: 0.15, sMax: 0.65, vMin: 0.4, vMax: 0.9 }
    ];

    const matchesSkinRange = skinRanges.some(range => 
      h >= range.hMin && h <= range.hMax &&
      s >= range.sMin && s <= range.sMax &&
      v >= range.vMin && v <= range.vMax
    );

    // Additional check: ensure it looks like skin texture (not hair)
    return matchesSkinRange && this.hasSkinnessIndicators(r, g, b);
  }

  // More aggressive hair detection in likely hair regions (top of image)
  private isProbablyHairByPosition(h: number, s: number, v: number, r: number, g: number, b: number): boolean {
    // In the top 30% of image, be much more aggressive about hair detection
    const avgBrightness = (r + g + b) / 3;
    
    // Brown/dark hair indicators in hair region
    const isDarkBrown = h >= 10 && h <= 40 && s > 0.2 && v < 0.7;
    const isTooDark = avgBrightness < 120;
    const hasHairSaturation = s > 0.3 && v < 0.6;
    
    return isDarkBrown || isTooDark || hasHairSaturation;
  }

  // Detect obvious hair colors to exclude them
  private isHairColor(h: number, s: number, v: number): boolean {
    const hairRanges = [
      // Dark brown/black hair (obvious cases)
      { hMin: 0, hMax: 30, sMin: 0.3, sMax: 1.0, vMin: 0.02, vMax: 0.4 },
      // Brown hair (obvious cases)
      { hMin: 15, hMax: 35, sMin: 0.5, sMax: 1.0, vMin: 0.1, vMax: 0.6 },
      // Very dark colors (likely hair)
      { hMin: 0, hMax: 360, sMin: 0.0, sMax: 1.0, vMin: 0.0, vMax: 0.25 }
    ];

    return hairRanges.some(range => 
      h >= range.hMin && h <= range.hMax &&
      s >= range.sMin && s <= range.sMax &&
      v >= range.vMin && v <= range.vMax
    );
  }

  // Balanced skin texture indicators
  private hasSkinnessIndicators(r: number, g: number, b: number): boolean {
    // More balanced skin validation - detect skin but avoid obvious hair
    
    // 1. Basic brightness check (not too dark)
    if (r < 60 || g < 45 || b < 35) {
      return false;
    }
    
    // 2. Skin typically has slight red dominance
    const redness = r / Math.max(g, b, 1);
    const hasRedTone = redness > 1.0 && redness < 1.6;
    
    // 3. Avoid extremely saturated colors (hair/clothing)
    const colorRange = Math.max(r, g, b) - Math.min(r, g, b);
    const notOverSaturated = colorRange < 100;
    
    // 4. Reasonable brightness range for skin
    const avgBrightness = (r + g + b) / 3;
    const reasonableBrightness = avgBrightness > 80 && avgBrightness < 240;
    
    // 5. Exclude very dark tones that are clearly hair
    const notTooDark = avgBrightness > 90;
    
    return hasRedTone && notOverSaturated && reasonableBrightness && notTooDark;
  }

  // Convert RGB to HSV
  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = (60 * ((g - b) / diff) + 360) % 360;
      } else if (max === g) {
        h = (60 * ((b - r) / diff) + 120) % 360;  
      } else {
        h = (60 * ((r - g) / diff) + 240) % 360;
      }
    }

    const s = max === 0 ? 0 : diff / max;
    const v = max;

    return { h, s, v };
  }

  // Find connected skin regions using flood fill algorithm
  private findSkinRegions(skinMask: ImageData, width: number, height: number): SkinRegion[] {
    const visited = new Uint8Array(width * height);
    const regions: SkinRegion[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const pixelIndex = index * 4;
        
        if (skinMask.data[pixelIndex]! > 0 && !visited[index]) {
          const region = this.floodFillRegion(skinMask, x, y, visited, width, height);
          
          // Filter out small regions (noise) - adjusted threshold for better detection
          if (region && region.area > 50) { // Minimum 50 pixels
            regions.push({
              ...region,
              id: `skin_region_${regions.length}`,
              bodyPart: this.classifyBodyPart(region, width, height)
            });
          }
        }
      }
    }

    // Sort regions by size (largest first)
    regions.sort((a, b) => b.area - a.area);
    
    return regions;
  }

  // Flood fill algorithm to find connected skin region
  private floodFillRegion(skinMask: ImageData, startX: number, startY: number, visited: Uint8Array, width: number, height: number): Omit<SkinRegion, 'id' | 'bodyPart'> | null {
    const stack: Point[] = [{ x: startX, y: startY }];
    const regionPixels: Point[] = [];
    
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;

    while (stack.length > 0) {
      const point = stack.pop();
      if (!point) continue;
      
      const { x, y } = point;
      const index = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[index]) {
        continue;
      }
      
      const pixelIndex = index * 4;
      if (skinMask.data[pixelIndex] === 0) {
        continue;
      }
      
      visited[index] = 1;
      regionPixels.push({ x, y });
      
      // Update bounding box
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add neighbors to stack
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    if (regionPixels.length === 0) {
      return null;
    }

    // Create simplified polygon from boundary pixels
    const polygon = this.createSimplePolygon(regionPixels);
    
    return {
      polygon,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      area: regionPixels.length,
      confidence: Math.min(1.0, regionPixels.length / 1000), // Confidence based on size
      centerPoint: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
      }
    };
  }

  // Create simplified polygon from region pixels (using bounding box for now)
  private createSimplePolygon(pixels: Point[]): Point[] {
    if (pixels.length === 0) return [];
    
    // For now, create a simple polygon using bounding box corners
    // This can be enhanced later with proper boundary detection
    let minX = pixels[0]!.x, maxX = pixels[0]!.x;
    let minY = pixels[0]!.y, maxY = pixels[0]!.y;
    
    for (const pixel of pixels) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    }
    
    // Return bounding box as polygon (simplified approach)
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
  }

  // Enhanced body part classification based on region characteristics
  private classifyBodyPart(region: Omit<SkinRegion, 'id' | 'bodyPart'>, imageWidth: number, imageHeight: number): SkinRegion['bodyPart'] {
    const { centerPoint, boundingBox, area } = region;
    const relativeX = centerPoint.x / imageWidth;
    const relativeY = centerPoint.y / imageHeight;
    const aspectRatio = boundingBox.width / boundingBox.height;
    const relativeArea = area / (imageWidth * imageHeight);
    
    // Face detection (top-center, roughly square, significant size in upper area)
    if (relativeY < 0.5 && relativeX > 0.15 && relativeX < 0.85 && 
        aspectRatio > 0.6 && aspectRatio < 1.5 && relativeArea > 0.02) {
      return 'face';
    }
    
    // Neck detection (below potential face area, narrow, central)
    if (relativeY > 0.35 && relativeY < 0.65 && relativeX > 0.3 && relativeX < 0.7 && 
        aspectRatio < 0.7 && relativeArea > 0.005) {
      return 'neck';
    }
    
    // Arms detection (sides, elongated, moderate size)
    if ((relativeX < 0.25 || relativeX > 0.75) && aspectRatio < 0.5 && relativeArea > 0.01) {
      return 'arm';
    }
    
    // Hands detection (small, at extremities, any vertical position)
    if ((relativeX < 0.15 || relativeX > 0.85) && relativeArea < 0.02 && relativeArea > 0.001) {
      return 'hand';
    }
    
    // Torso detection (center, large area, middle section)
    if (relativeX > 0.25 && relativeX < 0.75 && relativeY > 0.3 && relativeY < 0.8 && 
        relativeArea > 0.03) {
      return 'torso';
    }
    
    // Legs detection (lower area, elongated, significant size)
    if (relativeY > 0.5 && aspectRatio < 0.7 && relativeArea > 0.015) {
      return 'leg';
    }
    
    // Feet detection (bottom area, small to moderate size)
    if (relativeY > 0.8 && relativeArea > 0.002 && relativeArea < 0.02) {
      return 'foot';
    }
    
    return 'unknown';
  }

  // Determine visible skin areas from detected regions
  private determineVisibleSkinAreas(regions: SkinRegion[]): {
    face?: boolean;
    arms?: boolean;
    hands?: boolean;
    legs?: boolean;
    torso?: boolean;
    neck?: boolean;
  } {
    const visibleAreas: any = {};
    
    for (const region of regions) {
      const bodyPart = region.bodyPart;
      
      switch (bodyPart) {
        case 'face':
          visibleAreas.face = true;
          break;
        case 'arm':
          visibleAreas.arms = true;
          break;
        case 'hand':
          visibleAreas.hands = true;
          break;
        case 'leg':
          visibleAreas.legs = true;
          break;
        case 'torso':
          visibleAreas.torso = true;
          break;
        case 'neck':
          visibleAreas.neck = true;
          break;
      }
    }
    
    return visibleAreas;
  }

  // Check if a point is within any skin region
  isPointInSkinArea(x: number, y: number, regions: SkinRegion[]): { inSkin: boolean; region?: SkinRegion } {
    for (const region of regions) {
      if (this.pointInPolygon({ x, y }, region.polygon)) {
        return { inSkin: true, region };
      }
    }
    return { inSkin: false };
  }

  // Simple point-in-polygon test for rectangular polygons
  private pointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;
    
    const { x, y } = point;
    
    // For simplified rectangular polygons, check if point is within bounds
    let minX = polygon[0]!.x, maxX = polygon[0]!.x;
    let minY = polygon[0]!.y, maxY = polygon[0]!.y;
    
    for (const p of polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  // Clean up resources
  dispose(): void {
    this.isInitialized = false;
  }
} 
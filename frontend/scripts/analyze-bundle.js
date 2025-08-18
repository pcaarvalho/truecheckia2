#!/usr/bin/env node

/**
 * Bundle Analysis Script for TrueCheckIA Frontend
 * Analyzes the build output and provides performance insights
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// Performance thresholds (relaxed for Vercel deployment)
const THRESHOLDS = {
  totalSize: 5000 * 1024, // 5MB (increased)
  jsSize: 2000 * 1024,    // 2MB (increased)
  cssSize: 500 * 1024,    // 500KB (increased)
  imageSize: 1000 * 1024, // 1MB (increased)
  chunkSize: 500 * 1024,  // 500KB per chunk (increased)
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

function getFilesRecursively(dir, extension = '') {
  let files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getFilesRecursively(itemPath, extension));
    } else if (!extension || item.endsWith(extension)) {
      files.push({
        name: item,
        path: itemPath,
        size: stat.size,
        relativePath: path.relative(DIST_DIR, itemPath),
      });
    }
  }
  
  return files;
}

function analyzeAssets() {
  console.log(`${colors.bold}${colors.blue}📊 Analyzing Build Assets${colors.reset}\n`);
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`${colors.red}❌ Build directory not found: ${DIST_DIR}${colors.reset}`);
    console.log(`${colors.yellow}💡 Run 'npm run build' first${colors.reset}`);
    process.exit(1);
  }
  
  const jsFiles = getFilesRecursively(ASSETS_DIR, '.js');
  const cssFiles = getFilesRecursively(ASSETS_DIR, '.css');
  const imageFiles = getFilesRecursively(DIST_DIR).filter(file => 
    /\\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(file.name)
  );
  const otherFiles = getFilesRecursively(DIST_DIR).filter(file => 
    !/\\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|html|json|txt)$/i.test(file.name)
  );
  
  // Calculate totals
  const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const totalImageSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
  const totalOtherSize = otherFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalJsSize + totalCssSize + totalImageSize + totalOtherSize;
  
  // Performance assessment
  function getPerformanceColor(size, threshold) {
    if (size <= threshold * 0.7) return colors.green;
    if (size <= threshold) return colors.yellow;
    return colors.red;
  }
  
  function getPerformanceIcon(size, threshold) {
    if (size <= threshold * 0.7) return '✅';
    if (size <= threshold) return '⚠️';
    return '❌';
  }
  
  // Display results
  console.log(`${colors.bold}📈 Build Size Analysis${colors.reset}`);
  console.log('='.repeat(50));
  
  const totalColor = getPerformanceColor(totalSize, THRESHOLDS.totalSize);
  const totalIcon = getPerformanceIcon(totalSize, THRESHOLDS.totalSize);
  console.log(`${totalIcon} Total Size: ${totalColor}${formatBytes(totalSize)}${colors.reset} (target: ${formatBytes(THRESHOLDS.totalSize)})`);
  
  const jsColor = getPerformanceColor(totalJsSize, THRESHOLDS.jsSize);
  const jsIcon = getPerformanceIcon(totalJsSize, THRESHOLDS.jsSize);
  console.log(`${jsIcon} JavaScript: ${jsColor}${formatBytes(totalJsSize)}${colors.reset} (target: ${formatBytes(THRESHOLDS.jsSize)})`);
  
  const cssColor = getPerformanceColor(totalCssSize, THRESHOLDS.cssSize);
  const cssIcon = getPerformanceIcon(totalCssSize, THRESHOLDS.cssSize);
  console.log(`${cssIcon} CSS: ${cssColor}${formatBytes(totalCssSize)}${colors.reset} (target: ${formatBytes(THRESHOLDS.cssSize)})`);
  
  const imageColor = getPerformanceColor(totalImageSize, THRESHOLDS.imageSize);
  const imageIcon = getPerformanceIcon(totalImageSize, THRESHOLDS.imageSize);
  console.log(`${imageIcon} Images: ${imageColor}${formatBytes(totalImageSize)}${colors.reset} (target: ${formatBytes(THRESHOLDS.imageSize)})`);
  
  if (totalOtherSize > 0) {
    console.log(`📦 Other: ${formatBytes(totalOtherSize)}`);
  }
  
  console.log();
  
  // Detailed file breakdown
  if (jsFiles.length > 0) {
    console.log(`${colors.bold}📜 JavaScript Files${colors.reset}`);
    console.log('-'.repeat(30));
    jsFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        const color = getPerformanceColor(file.size, THRESHOLDS.chunkSize);
        const icon = getPerformanceIcon(file.size, THRESHOLDS.chunkSize);
        console.log(`${icon} ${file.name}: ${color}${formatBytes(file.size)}${colors.reset}`);
      });
    
    if (jsFiles.length > 10) {
      console.log(`... and ${jsFiles.length - 10} more files`);
    }
    console.log();
  }
  
  if (cssFiles.length > 0) {
    console.log(`${colors.bold}🎨 CSS Files${colors.reset}`);
    console.log('-'.repeat(30));
    cssFiles
      .sort((a, b) => b.size - a.size)
      .forEach(file => {
        console.log(`📄 ${file.name}: ${formatBytes(file.size)}`);
      });
    console.log();
  }
  
  // Large files warning
  const largeFiles = [...jsFiles, ...cssFiles, ...imageFiles]
    .filter(file => file.size > THRESHOLDS.chunkSize)
    .sort((a, b) => b.size - a.size);
  
  if (largeFiles.length > 0) {
    console.log(`${colors.bold}${colors.red}⚠️  Large Files (>${formatBytes(THRESHOLDS.chunkSize)})${colors.reset}`);
    console.log('-'.repeat(40));
    largeFiles.forEach(file => {
      console.log(`${colors.red}• ${file.relativePath}: ${formatBytes(file.size)}${colors.reset}`);
    });
    console.log();
  }
  
  // Optimization suggestions
  console.log(`${colors.bold}💡 Optimization Suggestions${colors.reset}`);
  console.log('-'.repeat(35));
  
  if (totalSize > THRESHOLDS.totalSize) {
    console.log(`${colors.yellow}• Consider code splitting for large chunks${colors.reset}`);
    console.log(`${colors.yellow}• Enable tree-shaking for unused code${colors.reset}`);
  }
  
  if (totalJsSize > THRESHOLDS.jsSize) {
    console.log(`${colors.yellow}• Use dynamic imports for non-critical components${colors.reset}`);
    console.log(`${colors.yellow}• Consider lazy loading for routes${colors.reset}`);
  }
  
  if (totalCssSize > THRESHOLDS.cssSize) {
    console.log(`${colors.yellow}• Remove unused CSS classes${colors.reset}`);
    console.log(`${colors.yellow}• Consider CSS purging tools${colors.reset}`);
  }
  
  if (totalImageSize > THRESHOLDS.imageSize) {
    console.log(`${colors.yellow}• Optimize images (WebP, compression)${colors.reset}`);
    console.log(`${colors.yellow}• Use lazy loading for images${colors.reset}`);
  }
  
  if (largeFiles.length === 0 && totalSize <= THRESHOLDS.totalSize) {
    console.log(`${colors.green}✨ Build is well optimized!${colors.reset}`);
  }
  
  console.log();
  
  // Gzip estimation
  console.log(`${colors.bold}📦 Estimated Gzip Sizes${colors.reset}`);
  console.log('-'.repeat(25));
  console.log(`JavaScript: ~${formatBytes(totalJsSize * 0.3)} (70% compression)`);
  console.log(`CSS: ~${formatBytes(totalCssSize * 0.2)} (80% compression)`);
  console.log(`Total: ~${formatBytes(totalSize * 0.35)} (65% compression)`);
  
  return {
    totalSize,
    totalJsSize,
    totalCssSize,
    totalImageSize,
    totalOtherSize,
    jsFiles: jsFiles.length,
    cssFiles: cssFiles.length,
    imageFiles: imageFiles.length,
    largeFiles: largeFiles.length,
  };
}

function generateReport(analysis) {
  const reportPath = path.join(DIST_DIR, 'bundle-analysis.json');
  const report = {
    timestamp: new Date().toISOString(),
    analysis,
    thresholds: THRESHOLDS,
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`${colors.blue}📋 Analysis report saved to: ${reportPath}${colors.reset}`);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const analysis = analyzeAssets();
    generateReport(analysis);
    
    // Exit with error code if any thresholds are exceeded
    const hasIssues = 
      analysis.totalSize > THRESHOLDS.totalSize ||
      analysis.totalJsSize > THRESHOLDS.jsSize ||
      analysis.totalCssSize > THRESHOLDS.cssSize ||
      analysis.totalImageSize > THRESHOLDS.imageSize ||
      analysis.largeFiles > 0;
    
    if (hasIssues) {
      console.log(`${colors.red}❌ Build exceeds performance thresholds${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.green}✅ Build meets all performance thresholds${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Analysis failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

export { analyzeAssets, formatBytes };
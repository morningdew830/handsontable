/**
 * Modifies the symlinks in `node_modules` for the defined packages.
 * Used to alias packages for internal importing.
 */
import fse from 'fs-extra';
import path from 'path';
import {
  displayConfirmationMessage,
  displayWarningMessage,
  displayErrorMessage,
} from './utils/console.mjs';

const supportedPackages = ['handsontable', '@handsontable/react', '@handsontable/angular', '@handsontable/vue'];
let [pkgName] = process.argv.slice(2);

if (pkgName) {
  // remove version from package name (e.g. @handsontable/angular-13 -> @handsontable/angular)
  pkgName = pkgName.replace(/-\d+/, '');
}

if (supportedPackages.includes(pkgName) === false) {
  displayErrorMessage(`Cannot create symlink for unsupported package (protection against Path Traversal vulnerability).`);

  process.exit(1);
}

const PACKAGE_LOCATIONS = new Map([
  ['handsontable', './handsontable/tmp'],
  ['@handsontable/angular', './wrappers/angular/dist/hot-table']
]);
const linkPackage = (packageName, packageLocation) => {
  if (fse.pathExistsSync(`${packageLocation}`)) {
    fse.removeSync(
      path.resolve(`./node_modules/${packageName}`),
    );

    fse.ensureSymlinkSync(
      path.resolve(`${packageLocation}`),
      path.resolve(`./node_modules/${packageName}`),
      'junction',
    );

    displayConfirmationMessage(`Symlink created ${packageName} -> ${packageLocation}.`);

  } else {
    displayWarningMessage(`Cannot create symlink to ${packageLocation} - the path doesn't exist.`);
  }
};

if (pkgName && PACKAGE_LOCATIONS.has(pkgName)) {
  linkPackage(pkgName, PACKAGE_LOCATIONS.get(pkgName));

} else if (!pkgName) {
  for (const [packageName, packageLocation] of PACKAGE_LOCATIONS) {
    linkPackage(packageName, packageLocation);
  }

} else {
  displayWarningMessage(
    `No package location for provided ${pkgName}, doing nothing. Known packages names: ${
      Array.from(PACKAGE_LOCATIONS.keys()).join(', ')
    }.`);
}

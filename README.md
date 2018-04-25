# ILIAS Pegasus

ILIAS Pegasus is an app which is running on Android or iOS and integrate functions
of the ILIAS learn management system. For example viewing courses or personal news.
Furthermore it is possible to make files offline available to read them while offline.

## Getting Started
These instructions will get the ILIAS Pegasus app up and running.

### Prerequisites
The following tools are needed to build and deploy the app.

Ionic CLI:
```bash
npm install -g ionic
```

Cordova CLI:
```bash
npm install -g cordova
```

#### iOS Development
A few additional tools are needed to run the app on an iOS device or emulator.

Install xcode over the apple app store.

Install the development cli tools with 
```bash
xcode-select --install
```

Install ios-sim which is used to fire up the iOS emulator.
```bash
npm install -g ios-sim
```

Install ios-deploy which is used to deploy apps on a device.
```bash
npm install ios-deploy
```

#### Android Development

Install Android Studio from google.
<https://developer.android.com/studio/index.html>

Install the latest Android SDK with the Android Studio Android SDK manager.
Add the root of your Android SDK to the environment variable $ANDROID_HOME.

Install the Java 8 SDK from oracle. Java 9 and 10 are not supported at the moment.
<http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html>
Add the path to your java runtime to the $JAVA_HOME environment variable.

### Install
Clone the project to your workspace.
Change into the cloned project and install all dependencies.
This could take several minutes.
```bash
npm install
```

Install the both platforms.
```bash
ionic cordova prepare
```

Copy and edit the template of config.json and add the development ILIAS
installation.
```bash
mv src/assets/config.json.template src/assets/config.json
```

### Debug Build

The iOS app can be build with the following command.
```bash
ionic cordova build ios
```

The Android can be build with the same command.
```bash
ionic cordova build android
```

## Deployment

### Configuration
Add only the productive ILIAS installations which are ready for production use.

Move the template file if not already done.
```bash
mv src/assets/config.json.template src/assets/config.json
```

**Caution!** Never reuse a installation id, use a new one instead.

### iOS

The iOS app can be build with the following command.
```bash
ionic cordova build ios --release --prod
```

### Android

There is a separate build script `./tools/build-android.sh` which can be
used to build the Android release version. Execute the script in the root of the app
project. Only Linux and macOS are currently supported by the build script.
```bash
./tools/build-android.sh
```

There is a range of environment variables which can be used to run the Android build scripts.
- **ANDROID_BUILD_TOOLS_VERSION** - Set the Android tools version which should be used for example "27.0.3"
- **KEYSTORE_PASSWORD** - The password of the keystore which is used to sign the app, the script will ask for a password if empty.
- **KEY_STORE** - The path to the keystore which should be used to sign the app.
- **OUTPUT_DIR** - The directory which will contain the signed build of the Android app.
- **PROJECT_ROOT** - The project root of the project which should be built, defaults to current working directory.

Example with options.
```bash
ANDROID_BUILD_TOOLS_VERSION="27.0.3" \  
KEY_STORE="mystore.jks" \ 
OUTPUT_DIR="./bin" \ 
./tools/build-android.sh
```

### Build With
* [Cordova](https://cordova.apache.org/) - Is powering the app.
* [Ionic](https://ionicframework.com/) - To build a responsive UI.
* [Typescript](https://www.typescriptlang.org/) - Helps maintaining large code bases and catch type issues early.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [releases on this repository](https://github.com/studer-raimann/ILIAS-Pegasus/releases). 

## Authors

See the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the GNU GPLv3 License - see the [LICENSE.md](LICENSE.md) file for details.

### Contact
[info@studer-raimann.ch](mailto://info@studer-raimann.ch)  
<https://studer-raimann.ch> 

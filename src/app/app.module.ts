import {NgModule, ErrorHandler} from '@angular/core';
import {IonicApp, IonicModule, IonicErrorHandler} from 'ionic-angular';
import { MyApp } from './app.component';
import {HttpModule, Http} from '@angular/http';
import {ConnectionService} from "../services/ilias-app.service";
import {ILIASRestProvider} from "../providers/ilias-rest.provider";
import {MigrationsService} from "../services/migrations.service";
import {FooterToolbarService} from "../services/footer-toolbar.service";
import {FileService} from "../services/file.service";
import {DataProvider} from "../providers/data-provider.provider";
import {ObjectListPage} from "../pages/object-list/object-list";
import {FavoritesPage} from "../pages/favorites/favorites";
import {NewObjectsPage} from "../pages/new-objects/new-objects";
import {SettingsPage} from "../pages/settings/settings";
import {InfoPage} from "../pages/info/info";
import {MapPage} from "../learnplace/pages/map/map.component";
import {SynchronizationService} from "../services/synchronization.service";
import {DataProviderFileObjectHandler} from "../providers/handlers/file-object-handler";
import {FileSizePipe} from "../pipes/fileSize.pipe";
import {TranslateModule} from 'ng2-translate/ng2-translate';
import {TranslateLoader} from "ng2-translate/src/translate.service";
import {TranslateStaticLoader} from "ng2-translate/src/translate.service";
import {ObjectDetailsPage} from "../pages/object-details/object-details";
import {LoginPage} from "../pages/login/login";
import {ModalPage} from "../pages/modal/modal";
import {SyncFinishedModal} from "../pages/sync-finished-modal/sync-finished-modal";
import {TokenUrlConverter} from "../services/url-converter.service";
import {BrowserModule} from "@angular/platform-browser";
import {InAppBrowser} from "@ionic-native/in-app-browser";
import {StatusBar} from "@ionic-native/status-bar";
import {FileTransfer} from "@ionic-native/file-transfer";
import {Network} from "@ionic-native/network";
import {File} from "@ionic-native/file";
import {SQLite} from "@ionic-native/sqlite";
import {Toast} from "@ionic-native/toast";
import {HttpILIASConfigFactory, ILIAS_CONFIG_FACTORY} from "../services/ilias-config-factory";
import {HttpClient} from "../providers/http";
import {CONFIG_PROVIDER, ILIASConfigProvider} from "../config/ilias-config";
import {
  ILIAS_REST, ILIASRestImpl, ILIASTokenManager,
  TOKEN_MANAGER
} from "../providers/ilias/ilias.rest";
import {OAUTH2_DATA_SUPPLIER, TOKEN_RESPONSE_CONSUMER} from "../providers/ilias/ilias.rest-api";
import {Oauth2DataSupplierImpl, TokenResponseConsumerImpl} from "../config/ilias.rest-config";
import {TabsPage} from "../learnplace/pages/tabs/tabs.component";


export function createTranslateLoader(http: Http) {
  return new TranslateStaticLoader(http, './assets/i18n', '.json');
}

@NgModule({
  declarations: [
    MyApp,
    ObjectListPage,
    FavoritesPage,
    NewObjectsPage,
    SettingsPage,
    InfoPage,
    ObjectDetailsPage,
    LoginPage,
    FileSizePipe,
    SyncFinishedModal,
    ModalPage,
    MapPage,
    TabsPage
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    BrowserModule,
    HttpModule,
    TranslateModule.forRoot({
      provide: TranslateLoader,
      useFactory: (createTranslateLoader),
      deps: [Http]
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    ObjectListPage,
    FavoritesPage,
    NewObjectsPage,
    SettingsPage,
    InfoPage,
    ObjectDetailsPage,
    LoginPage,
    SyncFinishedModal,
    MapPage,
    TabsPage
  ],
  providers: [
    {
      provide: ILIAS_CONFIG_FACTORY,
      useClass: HttpILIASConfigFactory
    },

    /* from src/config/ilias-config */
    {
      provide: CONFIG_PROVIDER,
      useClass: ILIASConfigProvider
    },

    /* from src/providers/ilias/lias.rest */
    {
      provide: TOKEN_MANAGER,
      useClass: ILIASTokenManager
    },
    {
      provide: ILIAS_REST,
      useClass: ILIASRestImpl
    },

    /* from src/config/ilias.rest-config */
    {
      provide: OAUTH2_DATA_SUPPLIER,
      useClass: Oauth2DataSupplierImpl
    },
    {
      provide: TOKEN_RESPONSE_CONSUMER,
      useClass: TokenResponseConsumerImpl
    },

    ConnectionService,
    MigrationsService,
    ILIASRestProvider,
    FooterToolbarService,
    DataProvider,
    FileService,
    SynchronizationService,
    DataProviderFileObjectHandler,
    TokenUrlConverter,
    StatusBar,
    InAppBrowser,
    File,
    FileTransfer,
    Network,
    SQLite,
    Toast,
    HttpClient,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ],
  exports: [
    TranslateModule
  ]
})
export class AppModule {}

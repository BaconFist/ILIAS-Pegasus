import {Component, Inject} from "@angular/core";
import {InAppBrowser} from "@ionic-native/in-app-browser";
import {Alert, AlertController, ModalController, NavController, NavParams, Toast, ToastController} from "ionic-angular";
import {TranslateService} from "ng2-translate/src/translate.service";
import {MarkAsFavoriteAction} from "../../actions/mark-as-favorite-action";
import {ILIASObjectAction, ILIASObjectActionResult, ILIASObjectActionSuccess} from "../../actions/object-action";
import {OpenFileExternalAction} from "../../actions/open-file-external-action";
import {OPEN_OBJECT_IN_ILIAS_ACTION_FACTORY, OpenObjectInILIASAction} from "../../actions/open-object-in-ilias-action";
import {RemoveLocalFileAction} from "../../actions/remove-local-file-action";
import {RemoveLocalFilesAction} from "../../actions/remove-local-files-action";
import {SynchronizeAction} from "../../actions/synchronize-action";
import {UnMarkAsFavoriteAction} from "../../actions/unmark-as-favorite-action";
import {ILIASObject} from "../../models/ilias-object";
import {DataProvider} from "../../providers/data-provider.provider";
import {Builder} from "../../services/builder.base";
import {FileService} from "../../services/file.service";
import {FooterToolbarService} from "../../services/footer-toolbar.service";
import {LINK_BUILDER, LinkBuilder} from "../../services/link/link-builder.service";
import {Log} from "../../services/log.service";
import {Logger} from "../../services/logging/logging.api";
import {Logging} from "../../services/logging/logging.service";
import {SynchronizationService} from "../../services/synchronization.service";


@Component({
    templateUrl: "object-details.html"
})
export class ObjectDetailsPage {

    private readonly log: Logger = Logging.getLogger(ObjectDetailsPage.name);

    iliasObject: ILIASObject;

    actions: Array<ILIASObjectAction>;

    /**
     * Holds the details of the current displayed ILIASObject
     */
    details: Array<{label: string, value: string}>;

    constructor(public nav: NavController,
                public dataProvider: DataProvider,
                public sync: SynchronizationService,
                public file: FileService,
                public alert: AlertController,
                public toast: ToastController,
                public translate: TranslateService,
                public footerToolbar: FooterToolbarService,
                public modal: ModalController,
                private readonly browser: InAppBrowser,
                @Inject(OPEN_OBJECT_IN_ILIAS_ACTION_FACTORY)
                private readonly openInIliasActionFactory: (title: string, urlBuilder: Builder<Promise<string>>) => OpenObjectInILIASAction,
                @Inject(LINK_BUILDER) private readonly linkBuilder: LinkBuilder,
                params: NavParams) {
        this.iliasObject = params.get("object");
        Log.describe(this, "Showing details of: ", this.iliasObject);
    }

    ionViewDidLoad(): void {
        this.loadAvailableActions();
        this.loadObjectDetails();
    }

    executeAction(action: ILIASObjectAction): void {
        if (action.alert()) {
            const alert: Alert = this.alert.create({
                title: action.alert().title,
                subTitle: action.alert().subTitle,
                buttons: [
                    {
                        text: "Cancel",
                        role: "cancel",
                        handler: (): void => {
                            // alert.dismiss();
                        }
                    },
                    {
                        text: "Ok",
                        handler: (): void => {
                            this.executeAndHandleAction(action);
                        }
                    }
                ]
            });
            alert.present();
        } else {
            this.executeAndHandleAction(action);
        }
    }

    private executeAndHandleAction(action: ILIASObjectAction): void {
        this.log.trace(() => "executeAndHandleAction");
        this.log.debug(() => `action: ${action}`);
        action.execute()
            .then(result => this.actionHandler(result))
            .catch((error) => {
                this.log.warn(() => `action gone wrong: ${error}`);
                this.loadAvailableActions();
                this.loadObjectDetails();
                throw error;
        });
    }

    private actionHandler(result: ILIASObjectActionResult): void {
        Log.write(this, "actionHandler");
        this.handleActionResult(result);
        this.loadAvailableActions();
        this.loadObjectDetails();
    }

    private handleActionResult(result: ILIASObjectActionResult): void {
        Log.write(this, "handleActionResult");
        if (!result) return;
        if (result instanceof ILIASObjectActionSuccess) {
            if (result.message) {
                const toast: Toast = this.toast.create({
                    message: result.message,
                    duration: 3000
                });
                toast.present();
            }
        }
    }

    private loadObjectDetails(): void {
        this.iliasObject.presenter.details().then(details => {
            Log.describe(this, "Details are displayed: ", details);
            this.details = details;
        });
    }

    private loadAvailableActions(): void {
        this.actions = [
          this.openInIliasActionFactory(this.translate.instant("actions.view_in_ilias"), this.linkBuilder.default().target(this.iliasObject.refId))
        ];
        if (this.iliasObject.isContainer() && !this.iliasObject.isLinked()) {
            if (!this.iliasObject.isFavorite) {
                this.actions.push(new MarkAsFavoriteAction(
                  this.translate.instant("actions.mark_as_favorite"),
                  this.iliasObject,
                  this.sync)
                );
            } else if (this.iliasObject.isFavorite && this.iliasObject.offlineAvailableOwner != ILIASObject.OFFLINE_OWNER_SYSTEM) {
                this.actions.push(new UnMarkAsFavoriteAction(
                  this.translate.instant("actions.unmark_as_favorite"),
                  this.iliasObject,
                  this.file)
                );
                this.actions.push(new SynchronizeAction(
                  this.translate.instant("actions.synchronize"),
                  this.iliasObject,
                  this.sync,
                  this.modal,
                  this.translate)
                );
            }
            this.actions.push(new RemoveLocalFilesAction(
              this.translate.instant("actions.remove_local_files"),
              this.iliasObject,
              this.file,
              this.translate)
            );
        }
        if (this.iliasObject.type == "file") {
            this.file.existsFile(this.iliasObject).then(() => {
                this.actions.push(new OpenFileExternalAction(this.translate.instant("actions.open_in_external_app"), this.iliasObject, this.file));
                this.actions.push(new RemoveLocalFileAction(this.translate.instant("actions.remove_local_file"), this.iliasObject,
                    this.file, this.translate));
            }, () => {
                Log.write(this, "No file available: Remove and Open are not available.");
            });
            if (!this.iliasObject.isFavorite) {
                this.actions.push(new MarkAsFavoriteAction(
                  this.translate.instant("actions.mark_as_favorite"),
                  this.iliasObject,
                  this.sync)
                );
            } else if (this.iliasObject.isFavorite && this.iliasObject.offlineAvailableOwner != ILIASObject.OFFLINE_OWNER_SYSTEM) {
                this.actions.push(new UnMarkAsFavoriteAction(
                  this.translate.instant("actions.unmark_as_favorite"),
                  this.iliasObject,
                  this.file)
                );
            }
        }
    }

}

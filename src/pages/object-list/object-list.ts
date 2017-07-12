import {Component} from '@angular/core';
import {
    NavController, NavParams, ActionSheetController, AlertController,
    ToastController, Events, DateTime
} from 'ionic-angular';
import {DataProvider} from "../../providers/data-provider.provider";
import {ILIASObject} from "../../models/ilias-object";
import {FileService} from "../../services/file.service";
import {User} from "../../models/user";
import {SynchronizationService} from "../../services/synchronization.service";
import {LoginPage} from "../login/login";
import {ILIASObjectAction, ILIASObjectActionSuccess} from "../../actions/object-action";
import {ShowObjectListPageAction} from "../../actions/show-object-list-page-action";
import {OpenObjectInILIASAction} from "../../actions/open-object-in-ilias-action";
import {ShowDetailsPageAction} from "../../actions/show-details-page-action";
import {MarkAsFavoriteAction} from "../../actions/mark-as-favorite-action";
import {UnMarkAsFavoriteAction} from "../../actions/unmark-as-favorite-action";
import {MarkAsOfflineAvailableAction} from "../../actions/mark-as-offline-available-action";
import {UnMarkAsOfflineAvailableAction} from "../../actions/unmark-as-offline-available-action";
import {SynchronizeAction} from "../../actions/synchronize-action";
import {RemoveLocalFilesAction} from "../../actions/remove-local-files-action";
import {DesktopItem} from "../../models/desktop-item";
import {FooterToolbarService} from "../../services/footer-toolbar.service";
import {DownloadAndOpenFileExternalAction} from "../../actions/download-and-open-file-external-action";
import {TranslateService} from "ng2-translate/src/translate.service";
import {Log} from "../../services/log.service";
import {Job} from "../../services/footer-toolbar.service";
import {ModalController} from "ionic-angular/index";
import {SyncFinishedModal} from "../sync-finished-modal/sync-finished-modal";
import {CantOpenFileTypeException} from "../../exceptions/CantOpenFileTypeException";
import {LoadingController} from "ionic-angular/index";
import {NoWLANException} from "../../exceptions/noWLANException";
import {OfflineException} from "../../exceptions/OfflineException";
import {RESTAPIException} from "../../exceptions/RESTAPIException";

@Component({
    templateUrl: 'object-list.html',
})
export class ObjectListPage {

    /**
     * Objects under the given parent object
     */
    public objects: ILIASObject[] = [];

    /**
     * The parent container object that was clicked to display the current objects
     */
    public parent: ILIASObject;
    public pageTitle: string;
    public user: User;
    public actionSheetActive = false;
    public numberOfNewChildren = [];
    protected static desktopLastUpdate = null;

    constructor(public nav: NavController,
                params: NavParams,
                public actionSheet: ActionSheetController,
                public file: FileService,
                public sync: SynchronizationService,
                public modal: ModalController,
                public alert: AlertController,
                public toast: ToastController,
                public translate: TranslateService,
                public dataProvider: DataProvider,
                public footerToolbar: FooterToolbarService,
                public events: Events,
                public loading: LoadingController) {
        this.parent = params.get('parent');

        if (this.parent) {
            this.pageTitle = this.parent.title;
        } else {
            this.pageTitle = ''; // will be updated by the observer
            translate.get("object-list.title").subscribe((lng) => {
                this.pageTitle = lng;
            });
        }
        this.initEventListeners();
    }

    public ionViewDidEnter() {
        Log.write(this, "Did enter.");
        return this.calculateChildrenMarkedAsNew();
    }

    public ionViewDidLoad() {
        Log.write(this, "Did load page object list.");
        this.loadObjects()
            .then(() => User.currentUser())
            .then(user => this.sync.updateLastSync(user.id))
            .then(last => {
                if(!last && !this.sync.isRunning)
                    this.startSync();
                return Promise.resolve();
            })
            .catch(error => Log.error(this, error))
        Log.describe(this, "lastdate", this.sync.lastSync);
    }

    protected loadObjects() {
        return User.currentUser().then(user => {
            this.user = user;
            if (this.parent) {
                return this.loadObjectData();
            } else {
                return this.loadDesktopData();
            }
        }, () => {
            // We should never get to this page if no user is logged in... just in case -> redirect to LoginPage
            Log.write(this, "landed on object-list.");
            this.nav.setRoot(LoginPage);
        }).catch(error => {
            Log.error(this, error);
            if (error instanceof RESTAPIException) {
                //TODO: maybe some notification?
            }
        });
    }

    /**
     * loads the object data from the cache. iff the cache data is older than a minute then we also update the cache data with the api data.
     * @returns {Promise<void>}
     */
    protected loadObjectData(): Promise<any> {
        return this.loadCachedObjectData()
            .then(() => {
                let currentDate = new Date();
                let updatedAt = new Date(this.parent.updatedAt);
                
                let needsRefresh = updatedAt.getTime() + (1 * 60 * 1000) < currentDate.getTime();
                Log.describe(this, "needs refrehs", needsRefresh);
                if (needsRefresh)
                    return this.loadOnlineObjectData();
                else
                    return Promise.resolve();
            });
    }

    /**
     * Loads the object data from db cache.
     * @returns {Promise<void>}
     */
    protected loadCachedObjectData(): Promise<any> {
        this.footerToolbar.addJob(this.parent.refId, "");
        return ILIASObject.findByParentRefId(this.parent.refId, this.user.id)
            .then(objects => objects.sort(ILIASObject.compare))
            .then(objects => {
                // Update by ref id.
                this.objects = objects;
                this.calculateChildrenMarkedAsNew();
                this.footerToolbar.removeJob(this.parent.refId);
                return Promise.resolve();
            }).catch(error => {
                this.footerToolbar.removeJob(this.parent.refId);
                return Promise.reject(error);
            });
    }

    /**
     * loads the object data from the rest api and stores it into the db chache.
     * @returns {Promise<void>}
     */
    protected loadOnlineObjectData(): Promise<any> {
        this.footerToolbar.addJob(this.parent.refId, "");
        return this.dataProvider.getObjectData(this.parent, this.user, false).then(objects => {
            this.objects = objects;
            this.calculateChildrenMarkedAsNew();
            this.footerToolbar.removeJob(this.parent.refId);
            this.parent.updatedAt = new Date().toISOString();
            return Promise.resolve();
        }).catch(error => {
            this.footerToolbar.removeJob(this.parent.refId);
            return Promise.reject(error);
        });
    }

    /**
     * Loads desktop items from local DB and iff the sync is NOT running then update local data with remote data.
     */
    protected loadDesktopData() {
        return this.loadCachedDesktopData()
            .then(() => {
                if (this.sync.isRunning)
                    return Promise.resolve();
                else {
                    let currentDate = new Date();
                    let updatedAt = ObjectListPage.desktopLastUpdate != null ? ObjectListPage.desktopLastUpdate : new Date(1);

                    let needsRefresh = updatedAt.getTime() + (1 * 60 * 1000) < currentDate.getTime();
                    Log.describe(this, "needs refrehs", needsRefresh);
                    if (needsRefresh)
                        return this.loadOnlineDesktopData()
                            .then(() => {ObjectListPage.desktopLastUpdate = new Date()});
                    else
                        return Promise.resolve();
                }
            });
    }

    /**
     * load the desktop data from the local db.
     * @returns {Promise<void>}
     */
    protected loadCachedDesktopData(): Promise<any> {
        this.footerToolbar.addJob(Job.DesktopAction, "");

        return DesktopItem.findByUserId(this.user.id)
            .then(objects => {
                Log.describe(this, "Got desktop data before sorting", objects);
                return Promise.resolve(objects.sort(ILIASObject.compare));
            })
            .then(desktopItems => {
                Log.describe(this, "Desktop Data before:", desktopItems);
                this.objects = desktopItems;
                this.calculateChildrenMarkedAsNew();
                this.footerToolbar.removeJob(Job.DesktopAction);
                return Promise.resolve();
            }).catch(error => {
                this.footerToolbar.removeJob(Job.DesktopAction);
                return Promise.reject(error);
            });
    }

    /**
     * load the desktop data from the rest api. and save the data into the local db.
     * @returns {Promise<void>}
     */
    protected loadOnlineDesktopData(): Promise<any> {
        this.footerToolbar.addJob(Job.DesktopAction, "");

        return this.dataProvider.getDesktopData(this.user)
            .then(objects => objects.sort(ILIASObject.compare))
            .then(desktopItems => {
                Log.describe(this, "loading desktop data for  ", this.user);
                Log.describe(this, "Desktop Data after online update:", desktopItems);
                this.objects = desktopItems;
                this.calculateChildrenMarkedAsNew();
                this.footerToolbar.removeJob(Job.DesktopAction);
                if(this.sync.lastSync)
                return Promise.resolve();
            }).catch(error => {
                this.footerToolbar.removeJob(Job.DesktopAction);
                return Promise.reject(error);
            });
    }

    protected calculateChildrenMarkedAsNew() {
        // Container objects marked as offline available display the number of new children as badge
        this.objects.forEach(iliasObject => {
            if (iliasObject.isContainer()) {
                ILIASObject.findByParentRefIdRecursive(iliasObject.refId, iliasObject.userId).then(iliasObjects => {
                    let newObjects = iliasObjects.filter(iliasObject => {
                        return iliasObject.isNew || iliasObject.isUpdated;
                    });
                    let n = newObjects.length;
                    Log.describe(this, "Object:", iliasObject);
                    Log.describe(this, "Objects marked as new: ", n);
                    iliasObject.newSubItems = n;
                });
            } else {
                iliasObject.newSubItems = 0;
            }
        });
    }


    /**
     * Run a global synchronization
     */
    public startSync() {
        Log.write(this, "Sync start", [], []);
        this.footerToolbar.addJob(Job.Synchronize, this.translate.instant("synchronisation_in_progress"));
        this.sync.execute()
            .then(result => {
                this.calculateChildrenMarkedAsNew();
                return Promise.resolve(result);
            })
            .then((result) => {
                this.loadObjects().then(() => {
                    // We have some files that were marked but not downloaded. We need to explain why and open a modal.
                    if (result.objectsLeftOut.length > 0) {
                        let syncModal = this.modal.create(SyncFinishedModal, {syncResult: result});
                        syncModal.present();
                    } else {
                        // If there were no files left out and everything went okay, we just display a "okay" result!
                        this.displaySuccessToast();
                    }
                    //maybe some objects came in new.
                    this.footerToolbar.removeJob(Job.Synchronize);
                });
            }).catch((error) => {
                Log.error(this, error);
                if (error instanceof NoWLANException) {
                    this.footerToolbar.removeJob(Job.Synchronize);
                    this.displayAlert(this.translate.instant("sync.title"), this.translate.instant("sync.stopped_no_wlan"));
                    return Promise.resolve();
                }
                return Promise.reject(error);
            }).catch(error => {
                if (error instanceof RESTAPIException) {
                    this.displayAlert(this.translate.instant("sync.title"), this.translate.instant("actions.server_not_reachable"));
                    this.footerToolbar.removeJob(Job.Synchronize);
                    return Promise.resolve();
                }
                return Promise.reject(error);

            }).catch((message) => {
                this.footerToolbar.removeJob(Job.Synchronize);
                if (message) {
                    Log.error(this, message);
                    this.displayAlert(this.translate.instant("sync.title"), this.translate.instant("sync.sync_incomplete"));
                } else {
                    this.displayAlert(this.translate.instant("sync.title"), this.translate.instant("sync.sync_incomplete"))
                }
            });
    }

    protected displaySuccessToast() {
        let toast = this.toast.create({
            message: this.translate.instant("sync.success"),
            duration: 3000
        });
        toast.present();
    }

    protected displayAlert(title: string, message: string) {
        let alert = this.alert.create({
            title: title,
            message: message,
        });
        alert.present();
    }

    /**
     * Execute primary action of given object
     * @param iliasObject
     */
    public onClick(iliasObject: ILIASObject) {
        if (this.actionSheetActive) return;
        let primaryAction = this.getPrimaryAction(iliasObject);
        this.executeAction(primaryAction);
        // When executing the primary action, we reset the isNew state
        if (iliasObject.isNew || iliasObject.isUpdated) {
            iliasObject.isNew = false;
            iliasObject.isUpdated = false;
            iliasObject.save();
        }
    }

    /**
     * Returns the primary action for the given object
     * @param iliasObject
     * @returns {ILIASObjectAction}
     */
    protected getPrimaryAction(iliasObject: ILIASObject): ILIASObjectAction {
        if (iliasObject.isContainer()) {
            return new ShowObjectListPageAction(this.translate.instant("actions.show_object_list"), iliasObject, this.nav);
        }
        if (iliasObject.type == 'file') {
            return new DownloadAndOpenFileExternalAction(this.translate.instant("actions.download_and_open_in_external_app"), iliasObject, this.file, this.translate, this.alert);
        }

        return new OpenObjectInILIASAction(this.translate.instant("actions.view_in_ilias"), iliasObject);
    }

    /**
     * Show the action sheet for the given object
     * @param iliasObject
     */
    public showActions(iliasObject: ILIASObject) {
        this.actionSheetActive = true;
        let actionButtons = [];
        // let actions = this.objectActions.getActions(object, ILIASObjectActionsService.CONTEXT_ACTION_MENU);
        let actions: ILIASObjectAction[] = [
            new ShowDetailsPageAction(this.translate.instant("actions.show_details"), iliasObject, this.nav),
            new OpenObjectInILIASAction(this.translate.instant("actions.view_in_ilias"), iliasObject),
        ];
        if (!iliasObject.isFavorite) {
            actions.push(new MarkAsFavoriteAction(this.translate.instant("actions.mark_as_favorite"), iliasObject));
        } else if (iliasObject.isFavorite) {
            actions.push(new UnMarkAsFavoriteAction(this.translate.instant("actions.unmark_as_favorite"), iliasObject));
        }

        if (iliasObject.isContainer() || iliasObject.type == 'file') {
            if (!iliasObject.isOfflineAvailable) {
                actions.push(new MarkAsOfflineAvailableAction(this.translate.instant("actions.mark_as_offline_available"), iliasObject, this.dataProvider, this.sync, this.modal));
            } else if (iliasObject.isOfflineAvailable && iliasObject.offlineAvailableOwner != ILIASObject.OFFLINE_OWNER_SYSTEM) {
                actions.push(new UnMarkAsOfflineAvailableAction(this.translate.instant("actions.unmark_as_offline_available"), iliasObject));
                actions.push(new SynchronizeAction(this.translate.instant("actions.synchronize"), iliasObject, this.sync, this.modal, this.translate));
            }
            actions.push(new RemoveLocalFilesAction(this.translate.instant("actions.remove_local_files"), iliasObject, this.file, this.translate));
        }

        actions.forEach(action => {
            actionButtons.push({
                text: action.title,
                handler: () => {
                    this.actionSheetActive = false;
                    // This action displays an alert before it gets executed
                    if (action.alert()) {
                        let alert = this.alert.create({
                            title: action.alert().title,
                            subTitle: action.alert().subTitle,
                            buttons: [
                                {
                                    text: this.translate.instant("cancel"),
                                    role: 'cancel'
                                },
                                {
                                    text: 'Ok',
                                    handler: () => {
                                        this.executeAction(action);
                                    }
                                }
                            ]
                        });
                        alert.present();
                    } else {
                        this.executeAction(action);
                    }
                }
            });
        });
        actionButtons.push({
            text: this.translate.instant("cancel"),
            role: 'cancel',
            handler: () => {
                this.actionSheetActive = false;
            }
        });
        let actionSheet = this.actionSheet.create({
            'title': iliasObject.title,
            'buttons': actionButtons
        });
        actionSheet.onDidDismiss(() => {
            this.actionSheetActive = false;
        });
        actionSheet.present();
    }


    protected handleActionResult(result) {
        if (!result) return;
        if (result instanceof ILIASObjectActionSuccess) {
            if (result.message) {
                let toast = this.toast.create({
                    message: result.message,
                    duration: 3000
                });
                toast.present();
            }
        }
    }

    public initEventListeners(): void {
        // We want to refresh after a synchronization.
        this.events.subscribe("sync:complete", () => {
            this.loadObjects();
        });
    }

    public executeAction(action: ILIASObjectAction): void {
        var hash = action.instanceId();
        this.footerToolbar.addJob(hash, "");
        action.execute().then((result) => {
            this.handleActionResult(result);
            this.calculateChildrenMarkedAsNew();
            this.footerToolbar.removeJob(hash);
        }).catch((error: CantOpenFileTypeException) => {
            if (error instanceof CantOpenFileTypeException) {
                this.showAlert(this.translate.instant("actions.cant_open_file"));
                this.footerToolbar.removeJob(hash);
                return Promise.resolve();
            }
            return Promise.reject(error);
        }).catch((error) => {
            Log.error(this, error);
            if (error instanceof NoWLANException) {
                this.footerToolbar.removeJob(Job.Synchronize);
                this.displayAlert(this.translate.instant("sync.title"), this.translate.instant("sync.stopped_no_wlan"));
                return Promise.resolve();
            }
            return Promise.reject(error);
        }).catch(error => {
            if (error instanceof OfflineException) {
                this.showAlert(this.translate.instant("actions.offline_and_no_local_file"));
                this.footerToolbar.removeJob(hash);
                return Promise.resolve();
            }
            return Promise.reject(error);
        }).catch(error => {
            if (error instanceof RESTAPIException) {
                this.showAlert(this.translate.instant("actions.server_not_reachable"));
                this.footerToolbar.removeJob(hash);
                return Promise.resolve();
            }
            return Promise.reject(error);

        }).catch((message) => {
            if (message) {
                Log.describe(this, "action gone wrong: ", message);
            }

            this.showAlert(this.translate.instant("something_went_wrong"));
            this.footerToolbar.removeJob(hash);
        });
    }

    protected showAlert(message) {
        let alert = this.alert.create({
            title: message,
            buttons: [
                {
                    text: this.translate.instant("close"),
                    role: 'cancel'
                }
            ]
        });
        alert.present();
    }
}
/**
 *  https://github.com/apache/cordova-plugin-file
 *      cordova plugin add cordova plugin add cordova-plugin-file
 */
import {Observable, Subscriber} from 'rxjs';
import {TypeInfo} from '../core/typeinfo';
import {EAbort} from '../core/exception';
import {TCordovaPlugin} from './cordova.plugin';

export class ENativeFile extends EAbort
{
    constructor(err: FileError)
    {
        super();
    }
}

export class ENoEntry extends EAbort
{
    constructor()
    {
        super('e_no_entry');
    }
}

export class ENotDirectory extends EAbort
{
    constructor()
    {
        super('e_not_directory');
    }
}

export class ENotFile extends EAbort
{
    constructor()
    {
        super('e_not_file');
    }
}

declare global
{
    interface CordovaPlugins
    {
        File: typeof NativeFile;
    }

    const TEMPORARY: number;
    const PERSISTENT: number;

    function requestFileSystem(
        type: number,
        size: number,
        successCallback: (fileSystem: FileSystem) => void,
        errorCallback?: (fileError: FileError) => void): void;

    function resolveLocalFileSystemURL(url: string,
        successCallback: (entry: FileSystemEntry) => void,
        errorCallback?: (error: FileError) => void): void;

    function resolveLocalFileSystemURI(uri: string,
        successCallback: (entry: FileSystemEntry) => void,
        errorCallback?: (error: FileError) => void): void;

    interface Window
    {
        TEMPORARY: number;
        PERSISTENT: number;

        /**
         * Requests a filesystem in which to store application data.
         * @param type              Whether the filesystem requested should be persistent, as defined above. Use one of TEMPORARY or PERSISTENT.
         * @param size              This is an indicator of how much storage space, in bytes, the application expects to need.
         * @param successCallback   The callback that is called when the user agent provides a filesystem.
         * @param errorCallback     A callback that is called when errors happen, or when the request to obtain the filesystem is denied.
         */
        requestFileSystem(
            type: number,
            size: number,
            successCallback: (fileSystem: FileSystem) => void,
            errorCallback?: (fileError: FileError) => void): void;

        /**
         * Look up file system Entry referred to by local URL.
         * @param string url       URL referring to a local file or directory
         * @param successCallback  invoked with Entry object corresponding to URL
         * @param errorCallback    invoked if error occurs retrieving file system entry
         */
        resolveLocalFileSystemURL(url: string,
            successCallback: (entry: FileSystemEntry) => void,
            errorCallback?: (error: FileError) => void): void;
        /**
         * Look up file system Entry referred to by local URI.
         * @param string uri       URI referring to a local file or directory
         * @param successCallback  invoked with Entry object corresponding to URI
         * @param errorCallback    invoked if error occurs retrieving file system entry
         */
        resolveLocalFileSystemURI(uri: string,
            successCallback: (entry: FileSystemEntry) => void,
            errorCallback?: (error: FileError) => void): void;
    }

    const enum ErrorCode
    {
        FILE_NOT_FOUND_ERR = 1,
        FILE_SECURITY_ERR,
        FILE_ABORT_ERR,
        FILE_NOT_READABLE_ERR,
        FILE_ENCODING_ERR,
        FILE_NO_MODIFICATION_ALLOWED_ERR,
        FILE_INVALID_STATE_ERR,
        FILE_SYNTAX_ERR,
        FILE_INVALID_MODIFICATION_ERR,
        FILE_QUOTA_EXCEEDED_ERR,
        FILE_TYPE_MISMATCH_ERR,
        FILE_PATH_EXISTS_ERR
    }

    /** This interface represents a file system. */
    interface FileSystem
    {
        /* The name of the file system, unique across the list of exposed file systems. */
        readonly name: string;
        /** The root directory of the file system. */
        readonly root: FileSystemDirectoryEntry;
    }

    /**
     *  An abstract interface representing entries in a file system,
     *      each of which may be a FileSystemFileEntry or FileSystemDirectoryEntry.
     */
    interface FileSystemEntry
    {
        /** Entry is a file. */
        readonly isFile: boolean;
        /** Entry is a directory. */
        readonly isDirectory: boolean;
        /** The name of the entry, excluding the path leading to it. */
        readonly name: string;
        /** The full absolute path from the root to the entry. */
        readonly fullPath: string;
        /** The file system on which the entry resides. */
        readonly filesystem: FileSystem;

        /**
         * Look up the parent FileSystemDirectoryEntry containing this Entry. If this Entry is the root of its filesystem, its parent is itself.
         *  @param successCallback A callback that is called with the time of the last modification.
         *  @param errorCallback   A callback that is called when errors happen.
         */
        getParent(successCallback: (entry: FileSystemDirectoryEntry) => void,
            errorCallback?: (error: FileError) => void): void;

    // plugin extensions ------------------------------------------------------
         nativeURL: string;

        /**
         * Look up metadata about this entry.
         * @param successCallback A callback that is called with the time of the last modification.
         * @param errorCallback   A callback that is called when errors happen.
         */
        getMetadata(
            successCallback: (metadata: Metadata) => void,
            errorCallback?: (error: FileError) => void): void;
        /**
         * Move an entry to a different location on the file system. It is an error to try to:
         *     move a directory inside itself or to any child at any depth;move an entry into its parent if a name different from its current one isn't provided;
         *     move a file to a path occupied by a directory;
         *     move a directory to a path occupied by a file;
         *     move any element to a path occupied by a directory which is not empty.
         * A move of a file on top of an existing file must attempt to delete and replace that file.
         * A move of a directory on top of an existing empty directory must attempt to delete and replace that directory.
         * @param parent  The directory to which to move the entry.
         * @param newName The new name of the entry. Defaults to the Entry's current name if unspecified.
         * @param successCallback A callback that is called with the Entry for the new location.
         * @param errorCallback   A callback that is called when errors happen.
         */
        moveTo(parent: FileSystemDirectoryEntry,
            newName?: string,
            successCallback?: (entry: FileSystemEntry) => void,
            errorCallback?: (error: FileError) => void): void;
        /**
         * Copy an entry to a different location on the file system. It is an error to try to:
         *     copy a directory inside itself or to any child at any depth;
         *     copy an entry into its parent if a name different from its current one isn't provided;
         *     copy a file to a path occupied by a directory;
         *     copy a directory to a path occupied by a file;
         *     copy any element to a path occupied by a directory which is not empty.
         *     A copy of a file on top of an existing file must attempt to delete and replace that file.
         *     A copy of a directory on top of an existing empty directory must attempt to delete and replace that directory.
         * Directory copies are always recursive--that is, they copy all contents of the directory.
         * @param parent The directory to which to move the entry.
         * @param newName The new name of the entry. Defaults to the Entry's current name if unspecified.
         * @param successCallback A callback that is called with the Entry for the new object.
         * @param errorCallback A callback that is called when errors happen.
         */
        copyTo(parent: FileSystemDirectoryEntry,
            newName?: string,
            successCallback?: (entry: FileSystemEntry) => void,
            errorCallback?: (error: FileError) => void): void;
        /**
         * Returns a URL that can be used as the src attribute of a <video> or <audio> tag.
         * If that is not possible, construct a cdvfile:// URL.
         * @return string URL
         */
        toURL(): string;
        /**
         * Return a URL that can be passed across the bridge to identify this entry.
         * @return string URL that can be passed across the bridge to identify this entry
         */
        toInternalURL(): string;
        /**
         * Deletes a file or directory. It is an error to attempt to delete a directory that is not empty. It is an error to attempt to delete the root directory of a filesystem.
         * @param successCallback A callback that is called on success.
         * @param errorCallback   A callback that is called when errors happen.
         */
        remove(successCallback: () => void,
            errorCallback?: (error: FileError) => void): void;
    }

    /** This interface supplies information about the state of a file or directory. */
    interface Metadata
    {
        /** This is the time at which the file or directory was last modified. */
        modificationTime: Date;
        /** The size of the file, in bytes. This must return 0 for directories. */
        size: number;
    }

    /** This interface represents a directory on a file system. */
    interface FileSystemDirectoryEntry extends FileSystemEntry
    {
        /**
         * Creates a new FileSystemDirectoryReader to read Entries from this Directory.
         */
        createReader(): FileSystemDirectoryReader;

        /**
         * Creates or looks up a directory.
         *
         * @param path    Either an absolute path or a relative path from this FileSystemDirectoryEntry
         *                to the directory to be looked up or created.
         *                It is an error to attempt to create a directory whose immediate parent does not yet exist.
         * @param options If create and exclusive are both true and the path already exists, getDirectory must fail.
         *                If create is true, the path doesn't exist, and no other error occurs, getDirectory must create and return a corresponding FileSystemDirectoryEntry.
         *                If create is not true and the path doesn't exist, getDirectory must fail.
         *                If create is not true and the path exists, but is a file, getDirectory must fail.
         *                Otherwise, if no other error occurs, getDirectory must return a FileSystemDirectoryEntry corresponding to path.
         * @param successCallback A callback that is called to return the Directory selected or created.
         * @param errorCallback   A callback that is called when errors happen.
         */
        getDirectory(path: string, options?: FileOpenFlags,
            successCallback?: (entry: FileSystemDirectoryEntry) => void,
            errorCallback?: (error: FileError) => void): void;

        /**
         * Creates or looks up a file.
         *
         * @param path    Either an absolute path or a relative path from this FileSystemDirectoryEntry
         *                to the file to be looked up or created.
         *                It is an error to attempt to create a file whose immediate parent does not yet exist.
         * @param options If create and exclusive are both true, and the path already exists, getFile must fail.
         *                If create is true, the path doesn't exist, and no other error occurs, getFile must create it as a zero-length file and return a corresponding FileEntry.
         *                If create is not true and the path doesn't exist, getFile must fail.
         *                If create is not true and the path exists, but is a directory, getFile must fail.
         *                Otherwise, if no other error occurs, getFile must return a FileEntry corresponding to path.
         * @param successCallback A callback that is called to return the File selected or created.
         * @param errorCallback   A callback that is called when errors happen.
         */
        getFile(path: string, options?: FileOpenFlags,
            successCallback?: (entry: FileSystemFileEntry) => void,
            errorCallback?: (error: FileError) => void): void;

    // plugin extensions ------------------------------------------------------
        /**
         *  Deletes a directory and all of its contents, if any. In the event of an error (e.g. trying
         *      to delete a directory that contains a file that cannot be removed), some of the contents
         *      of the directory may be deleted. It is an error to attempt to delete the root directory of a filesystem.
         *
         * @param successCallback A callback that is called on success.
         * @param errorCallback   A callback that is called when errors happen.
         */
        removeRecursively(successCallback: () => void,
            errorCallback?: (error: FileError) => void): void;
    }

    /**
     * This dictionary is used to supply arguments to methods
     * that look up or create files or directories.
     */
    interface FileOpenFlags
    {
        /** Used to indicate that the user wants to create a file or directory if it was not previously there. */
        create?: boolean;
        /** By itself, exclusive must have no effect. Used with create, it must cause getFile and getDirectory to fail if the target path already exists. */
        exclusive?: boolean;
    }

    /**
     * This interface lets a user list files and directories in a directory. If there are
     * no additions to or deletions from a directory between the first and last call to
     * readEntries, and no errors occur, then:
     *     A series of calls to readEntries must return each entry in the directory exactly once.
     *     Once all entries have been returned, the next call to readEntries must produce an empty array.
     *     If not all entries have been returned, the array produced by readEntries must not be empty.
     *     The entries produced by readEntries must not include the directory itself ["."] or its parent [".."].
     */
    interface FileSystemDirectoryReader
    {
        /**
         * Read the next block of entries from this directory.
         * @param successCallback Called once per successful call to readEntries to deliver the next
         *                        previously-unreported set of Entries in the associated Directory.
         *                        If all Entries have already been returned from previous invocations
         *                        of readEntries, successCallback must be called with a zero-length array as an argument.
         * @param errorCallback   A callback indicating that there was an error reading from the Directory.
         */
        readEntries(
            successCallback: (entries: FileSystemEntry[]) => void,
            errorCallback?: (error: FileError) => void): void;
    }

    /** This interface represents a file on a file system. */
    interface FileSystemFileEntry extends FileSystemEntry
    {
        /**
         * Creates a new FileWriter associated with the file that this FileEntry represents.
         * @param successCallback A callback that is called with the new FileWriter.
         * @param errorCallback   A callback that is called when errors happen.
         */
        createWriter(successCallback: (writer: FileWriter) => void,
            errorCallback?: (error: FileError) => void): void;
        /**
         * Returns a File that represents the current state of the file that this FileEntry represents.
         * @param successCallback A callback that is called with the File.
         * @param errorCallback   A callback that is called when errors happen.
         */
        file(successCallback: (file: File) => void,
            errorCallback?: (error: FileError) => void): void;
    }

    /**
     * This interface provides methods to monitor the asynchronous writing of blobs
     * to disk using progress events and event handler attributes.
     */
    interface FileSaver extends EventTarget
    {
        /** The last error that occurred on the FileSaver. */
        error: Error;

        /** Terminate file operation */
        abort(): void;

        /**
         * The FileSaver object can be in one of 3 states. The readyState attribute, on getting,
         * must return the current state, which must be one of the following values:
         *     INIT
         *     WRITING
         *     DONE
         */
        readyState: number;

        onwritestart: (event: ProgressEvent) => void;
        onprogress: (event: ProgressEvent) => void;
        onwrite: (event: ProgressEvent) => void;
        onabort: (event: ProgressEvent) => void;
        onerror: (event: ProgressEvent) => void;
        onwriteend: (event: ProgressEvent) => void;
    }

    /**
     * This interface expands on the FileSaver interface to allow for multiple write
     * actions, rather than just saving a single Blob.
     */
    interface FileWriter extends FileSaver
    {
        /**
         * The byte offset at which the next write to the file will occur. This always less or equal than length.
         * A newly-created FileWriter will have position set to 0.
         */
        position: number;

        /**
         * The length of the file. If the user does not have read access to the file,
         * this will be the highest byte offset at which the user has written.
         */
        length: number;

        /**
         * Write the supplied data to the file at position.
         * @param data The blob to write.
         */
        write(data: Blob | string): void;

        /**
         * The file position at which the next write will occur.
         * @param offset If nonnegative, an absolute byte offset into the file.
         *               If negative, an offset back from the end of the file.
         */
        seek(offset: number): void;

        /**
         * Changes the length of the file to that specified. If shortening the file, data beyond the new length
         * will be discarded. If extending the file, the existing data will be zero-padded up to the new length.
         * @param size The size to which the length of the file is to be adjusted, measured in bytes.
         */
        truncate(size: number): void;
    }

    interface FileError
    {
        /** Error code */
        code: number;
    }

    /* FileWriter states */
    /*
    declare var FileWriter:
    {
        INIT: number;
        WRITING: number;
        DONE: number
    };
    */
}

class NativeFile extends TCordovaPlugin
{
    static override readonly Name: string = 'file';
    static override readonly Repository: string = 'cordova-plugin-file';
    /**
     *  File System Layout
     *  Device Path                         *                           r/w?    persistent? OS clears   sync    private
     * ---------------------------------------------------------------------------------------------------------------
     *  .iOs
     *      *   Files persist across app restarts and upgrades, but this directory can be cleared whenever the OS desires.
     *          Your app should be able to recreate any content that might be deleted.
     *      **  Files may persist across app restarts, but do not rely on this behavior. Files are not guaranteed to persist
     *          across updates. Your app should remove files from this directory when it is applicable, as the OS does not
     *          guarantee when (or even if) these files are removed.
     *      *** The OS may clear the contents of this directory whenever it feels it is necessary, but do not rely on this.
     *          You should clear this directory as appropriate for your application.
     * ---------------------------------------------------------------------------------------------------------------
     *  /var/mobile/Applications/<UUID>/    applicationStorageDirectory r       N/A         N/A         N/A     Yes
     *  appname.app/                        applicationDirectory        r       N/A         N/A         N/A     Yes
     *  Documents/                          documentsDirectory          r/w     Yes         No          Yes     Yes
     *  Documents/NoCloud/                  -                           r/w     Yes         No          No      Yes
     *  Library                             -                           r/w     Yes         No          Yes?    Yes
     *  Library/NoCloud/                    dataDirectory               r/w     Yes         No          No      Yes
     *  Library/Cloud/                      syncedDataDirectory         r/w     Yes         No          Yes     Yes
     *  Library/Caches/                     cacheDirectory              r/w     Yes*        Yes***      No      Yes
     *  tmp/                                tempDirectory               r/w     No**        Yes***      No      Yes
     * ---------------------------------------------------------------------------------------------------------------
     *  .Android
     *      *   The OS may periodically clear this directory, but do not rely on this behavior. Clear the contents of this
     *          directory as appropriate for your application. Should a user purge the cache manually, the contents of
     *          this directory are removed.
     *      **  The OS does not clear this directory automatically; you are responsible for managing the contents yourself.
     *          Should the user purge the cache manually, the contents of the directory are removed.
     *      Note: If external storage can't be mounted, the external* properties are null.
     * ---------------------------------------------------------------------------------------------------------------
     *  file:///android_asset/              applicationDirectory        r       N/A         N/A                 Yes
     *  /data/data/<app-id>/                applicationStorageDirectory r/w     N/A         N/A                 Yes
     *  /data/data/<app-id>/cache           cacheDirectory              r/w     Yes         Yes*                Yes
     *  /data/data/<app-id>/files           dataDirectory               r/w     Yes         No                  Yes
     *  /data/data/<app-id>/Documents       documents                   r/w     Yes         No                  Yes
     *  <sdcard>/                           externalRootDirectory       r/w     Yes         No                  No
     *  <sdcard>/Android/data/<app-id>/     externalApplicationStorageDirectory r/w  Yes    No                  No
     *  <sdcard>/Android/data/<app-id>/cache externalCacheDirectory     r/w     Yes         No**                No
     *  <sdcard>/Android/data/<app-id>/files externalDataDirectory      r/w     Yes         No                  No
     */

    /* Read-only directory where the application is installed. */
    static get applicationDirectory(): string
    {
        return this.GetProperty<string>('applicationDirectory');
    }

    /* Root of app's private storage */
    static get applicationStorageDirectory(): string
    {
        return this.GetProperty<string>('applicationStorageDirectory');
    }

    /* Where to put app-specific data files. */
    static get dataDirectory(): string
    {
        return this.GetProperty<string>('dataDirectory');
    }

    /* Cached files that should survive app restarts. Apps should not rely on the OS to delete files in here. */
    static get cacheDirectory(): string
    {
        return this.GetProperty<string>('cacheDirectory');
    }

/* Android Only */
    /* Android: the application space on external storage. */
    static get externalApplicationStorageDirectory(): string
    {
        return this.GetProperty<string>('externalApplicationStorageDirectory');
    }

    /* Android: Where to put app-specific data files on external storage. */
    static get externalDataDirectory(): string
    {
        return this.GetProperty<string>('externalDataDirectory');
    }

    /* Android: the application cache on external storage. */
    static get externalCacheDirectory(): string
    {
        return this.GetProperty<string>('externalCacheDirectory');
    }

    /* Android: the external storage (SD card) root. */
    static get externalRootDirectory(): string
    {
        return this.GetProperty<string>('externalRootDirectory');
    }

/* iOS Only */
    /* iOS: Temp directory that the OS can clear at will. */
    static get tempDirectory(): string
    {
        return this.GetProperty<string>('tempDirectory');
    }

    /* iOS: Holds app-specific files that should be synced (e.g. to iCloud). */
    static get syncedDataDirectory(): string
    {
        return this.GetProperty<string>('syncedDataDirectory');
    }

    /* iOS: Files private to the app, but that are meaningful to other applciations (e.g. Office files) */
    static get documentsDirectory(): string
    {
        return this.GetProperty<string>('documentsDirectory');
    }

/* BlackBerry10 */
    /* BlackBerry10: Files globally available to all apps */
    static get sharedDirectory(): string
    {
        return this.GetProperty<string>('sharedDirectory');
    }

    static ReadDir(path: string): Observable<FileSystemEntry>
    {
        return new Observable<FileSystemEntry>(obs =>
        {
            if (! TypeInfo.Assigned(window.resolveLocalFileSystemURL))
                return obs.complete();

            window.resolveLocalFileSystemURL(path,
                entry =>
                {
                    if (entry.isDirectory)
                        LoopReadDir((entry as FileSystemDirectoryEntry).createReader(), obs);
                    else
                        obs.error(new ENotDirectory());
                },
                (err: FileError) =>
                    obs.error(err));
        });

        function LoopReadDir(dir: FileSystemDirectoryReader, obs: Subscriber<FileSystemEntry>): void
        {
            dir.readEntries(
                entries =>
                {
                    if (entries.length > 0)
                    {
                        for (const iter of entries)
                            obs.next(iter);

                        setTimeout(() => LoopReadDir(dir, obs));
                    }
                    else
                        obs.complete();
                },
                err =>
                {
                    if (! obs.closed)
                        obs.error(new ENativeFile(err));
                }
            );
        }
    }

    static UnlinkAt(DirPath: string, FileName: string): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            window.resolveLocalFileSystemURL(DirPath, (dir: any) =>
            {
                dir.getFile(FileName, {create: false}, (fent: any) =>
                {
                    fent.remove(
                        () => resolve(),
                        (err: any) => reject(err),
                        () => reject(new ENoEntry())
                    );
                });
            });
        });
    }

    static Unlink(FilePath: string): Promise<void>
    {
        const Idx = FilePath.lastIndexOf('/');

        if (-1 !== Idx)
            return this.UnlinkAt(FilePath.substring(0, Idx), FilePath.substring(Idx + 1));
        else
            return this.UnlinkAt('/', FilePath);
    }

    static async CreateFileWriter(entry: FileSystemFileEntry): Promise<FileWriter>
    {
        return new Promise<FileWriter>((resolve, reject) => entry.createWriter(resolve, reject));
    }

    static async ReadAsArrayBuffer(src: string | FileSystemFileEntry | File): Promise<ArrayBuffer>
    {
        if (! (src instanceof File))
            src = await this.ToFile(src);

        return new Promise<ArrayBuffer>((resolve, reject) =>
        {
            const reader = new FileReader();

            // reader may block without state trigger
            let TimeoutTid: any;
            TimeoutTid = setTimeout(() =>
            {
                TimeoutTid = undefined;
                console.log(reader);
                if (TypeInfo.Assigned((reader as any)._result))
                    resolve((reader as any)._result as ArrayBuffer);
                else
                    reject('file read timedout without load');
            }, Math.round((src as File).size / 5000) + 1000); // 5M/s

            function CancelTimeout()
            {
                if (TypeInfo.Assigned(TimeoutTid))
                {
                    clearTimeout(TimeoutTid);
                    TimeoutTid = undefined;
                }
            }

            reader.onload = (ev) =>
            {
                CancelTimeout();
                if (TypeInfo.Assigned(ev.target) && TypeInfo.Assigned(ev.target.result))
                    resolve(ev.target.result as ArrayBuffer);
            };

            reader.onloadstart = (ev) => CancelTimeout();
            reader.onerror = (ev) =>
            {
                CancelTimeout();
                reject(new Error('reading error'));
            };

            reader.readAsArrayBuffer(src as File);
        });
    }

    static ResovleLocalFileSystemURL(url: string): Promise<FileSystemEntry>
    {
        return new Promise<FileSystemEntry>((resolve, reject) =>
            window.resolveLocalFileSystemURL(url, resolve, reject));
    }

    static ResovleLocalFileSystemURI(uri: string): Promise<FileSystemEntry>
    {
        return new Promise<FileSystemEntry>((resolve, reject) =>
            window.resolveLocalFileSystemURI(uri, resolve, reject));
    }

    static async ToFile(src: string | FileSystemFileEntry): Promise<File>
    {
        if (TypeInfo.IsString(src))
            src = await this.ResovleLocalFileSystemURL(src) as FileSystemFileEntry;

        if (src.isFile)
        {
            return new Promise<File>((resolve, reject) =>
                (src as FileSystemFileEntry).file(resolve, reject));
        }
        else
            return Promise.reject(new ENotFile());
    }

    static async Get(dir: string | FileSystemDirectoryEntry, name: string, options?: FileOpenFlags): Promise<FileSystemFileEntry>
    {
        if (TypeInfo.IsString(dir))
            dir = await this.ResovleLocalFileSystemURL(dir) as FileSystemDirectoryEntry;

        if (! dir.isDirectory)
            return Promise.reject(new ENotDirectory());

        return new Promise<FileSystemFileEntry>((resolve, reject) =>
            (dir as FileSystemDirectoryEntry).getFile(name, options, resolve, reject));
    }

    static async Write(dest: string | FileSystemFileEntry, data: Blob): Promise<number>
    {
        if (TypeInfo.IsString(dest))
            dest = await this.ResovleLocalFileSystemURL(dest) as FileSystemFileEntry;

        return new Promise<number>((resolve, reject) =>
        {
            (dest as FileSystemFileEntry).createWriter(
                (writer) =>
                {
                    writer.onwriteend = () =>
                    {
                        resolve(data.size);
                    };
                    writer.onerror = (event) =>
                    {
                        console.error(event);
                        reject(new Error((dest as FileSystemFileEntry).toURL() + ' writing err!'));
                    };
                    writer.write(data);
                },
                reject);
        });
    }
}
TCordovaPlugin.Register(NativeFile, 'File');

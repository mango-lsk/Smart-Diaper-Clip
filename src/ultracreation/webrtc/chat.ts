/**
 *  WebRTC support
 *      .phonegap-plugin-media-stream inorder to use camera in W3C std.
 *          cordova plugin add phonegap-plugin-media-stream
 *
 *      .npm install @types/webrtc for ES5 target
 *      .npm install webrtc-adapter for old device support
 */
import {Subject} from 'rxjs';
import {TypeInfo} from '../core/typeinfo';
import {Exception, EAbort, ENotImplemented} from '../core/exception';

const STUN_SERVERS: RTCIceServer[] = [
    // {'urls': 'stun:stun.l.google.com:19302'}
];
const TURN_SERVERS: RTCIceServer[] = [
];

const Config: RTCConfiguration = {
    iceServers: STUN_SERVERS.concat(TURN_SERVERS)
};

const ESTABLISH_TIMEOUT = 150000;

export class EChatNegotitation extends Exception
{
}

export class EChatReject extends EAbort
{
    constructor()
    {
        super('e_chat_reject');
    }
}

export class EChatEstablishTimeout extends EAbort
{
    constructor()
    {
        super('e_chat_establish_timeout');
    }
}

export interface IChatOptions
{
    Video?: true;
    Audio?: true;
}

export enum TChatState
{
    Hangup,
    // Rejected,
    Calling,
    Answering,
    Established,
}

export interface RTCSessionDescriptionInitCompat extends RTCSessionDescriptionInit
{
    type: any;
}

export interface IChatNegotitation extends IChatOptions
{
    SessionInit?: RTCSessionDescriptionInitCompat;
    Candidates?: RTCIceCandidate | RTCIceCandidate[];

    HostId?: string;
    ClientId?: string;
}

export interface IChatIncomingCall extends IChatNegotitation
{
    SessionInit: RTCSessionDescriptionInitCompat;
    Candidates?: RTCIceCandidate | RTCIceCandidate[];

    HostId: string;
    ClientId: string;
}

export class TChat extends Subject<TChatState>
{
    constructor()
    {
        super();

        this.PeerConn = new RTCPeerConnection(Config);
        this.Initialize();
    }

    async CreateOffer(Opts: IChatOptions, LocalMedia?: MediaStream): Promise<IChatNegotitation>
    {
        this.TimeoutId = setTimeout(() => this.Hangup(new EChatEstablishTimeout()), ESTABLISH_TIMEOUT);

        /*
        const c: IChatNegotitation = {};
        c.SessionInit = {type: 'offer'};
        return Promise.resolve(c);
        */
        return new Promise<IChatNegotitation>(async (resolve, reject) =>
        {
            let Offer: RTCSessionDescriptionInit;
            const Candidates = new Array<RTCIceCandidate>();

            this.PeerConn.onicecandidate = ev =>
            {
                if (ev.candidate)
                    Candidates.push(ev.candidate);
            };

            this.PeerConn.onicegatheringstatechange = ev =>
            {
                const Conn = ev.target as RTCPeerConnection;

                if (Conn.iceGatheringState === 'complete')
                {
                    console.log('WebRTC: offer ICE gathering complete.');
                    Conn.onicecandidate = null;
                    Conn.onicegatheringstatechange = null;

                    resolve({SessionInit: Offer as RTCSessionDescriptionInitCompat, Candidates});
                }
            };

            try
            {
                this.next(TChatState.Calling);
                const opt: RTCOfferOptions = {}; // {iceRestart: true};

                if (TypeInfo.Assigned(Opts.Video))
                {
                    try
                    {
                        (opt.offerToReceiveVideo as any) = true;
                        // this.PeerConn.addTransceiver('video');
                    }
                    catch (e)
                    {
                        console.log(`%cWebRTC: addTransceiver('video') compatiable issue, switch to offerToReceiveVideo=true`, 'color:orange');
                    }

                    if (TypeInfo.Assigned(LocalMedia))
                    {
                        const VideoTracks = LocalMedia.getVideoTracks();

                        if (VideoTracks.length > 1)
                            console.log('%cmore than 1 video tracks', 'color:orange');

                        if (VideoTracks.length > 0)
                            this.PeerConn.addTrack(VideoTracks[0], LocalMedia);
                        else
                            console.log('%cWebRTC: local has no video track', 'color:lightgreen');
                    }
                }
                if (TypeInfo.Assigned(Opts.Audio))
                {
                    try
                    {
                        (opt.offerToReceiveAudio as any) = true;
                        // this.PeerConn.addTransceiver('audio');
                    }
                    catch (e)
                    {
                        console.log(`%cWebRTC: addTransceiver('audio') compatiable issue, switch to offerToReceiveAudio=true`, 'color:orange');
                    }

                    if (TypeInfo.Assigned(LocalMedia))
                    {
                        const AudioTracks = LocalMedia.getAudioTracks();

                        if (AudioTracks.length > 1)
                            console.log('%cmore than 1 audio tracks', 'color:orange');

                        if (AudioTracks.length > 0)
                            this.PeerConn.addTrack(AudioTracks[0], LocalMedia);
                        else
                            console.log('%cWebRTC: local has no audio track', 'color:orange');
                    }
                }

                console.log(`WebRTC: createOffer(opt) ${JSON.stringify(opt)}`);
                Offer = await this.PeerConn.createOffer(opt);
                return this.PeerConn.setLocalDescription(Offer);
            }
            catch (err)
            {
                this.Hangup(err);
                reject(err);
            }
        });
    }

    async CreateAnswer(IncomingCall: IChatIncomingCall, LocalMedia?: MediaStream): Promise<IChatNegotitation>
    {
        this.TimeoutId = setTimeout(() => this.Hangup(new EChatEstablishTimeout()), ESTABLISH_TIMEOUT);

        return new Promise<IChatNegotitation>(async (resolve, reject) =>
        {
            let Answer: RTCSessionDescriptionInit;
            const Candidates = new Array<RTCIceCandidate>();

            this.PeerConn.onicecandidate = ev =>
            {
                if (ev.candidate)
                    Candidates.push(ev.candidate);
            };

            this.PeerConn.onicegatheringstatechange = ev =>
            {
                const Conn = ev.target as RTCPeerConnection;

                if (Conn.iceGatheringState === 'complete')
                {
                    console.log('WebRTC: answer ICE gathering complete.');

                    Conn.onicecandidate = null;
                    Conn.onicegatheringstatechange = null;

                    IncomingCall.SessionInit = Answer as RTCSessionDescriptionInitCompat;
                    IncomingCall.Candidates = Candidates;
                    resolve(IncomingCall);
                }
            };

            try
            {
                this.next(TChatState.Answering);
                await this.PeerConn.setRemoteDescription(IncomingCall.SessionInit);

                if (TypeInfo.Assigned(IncomingCall.Candidates))
                {
                    if (IncomingCall.Candidates instanceof Array)
                        IncomingCall.Candidates.forEach(c => this.PeerConn.addIceCandidate(c));
                    else
                        this.PeerConn.addIceCandidate(IncomingCall.Candidates);
                }

                if (TypeInfo.Assigned(LocalMedia))
                    LocalMedia.getTracks().forEach(t => this.PeerConn.addTrack(t, LocalMedia));

                Answer = await this.PeerConn.createAnswer({iceRestart: true});
                return this.PeerConn.setLocalDescription(Answer);
            }
            catch (err)
            {
                this.Hangup(err);
                reject(err);
            }
        });
    }

    Hangup(err?: any): void
    {
        if (this._State !== TChatState.Hangup)
        {
            this._State = TChatState.Hangup;

            if (TypeInfo.Assigned(err))
                this.error(err);
            else
                this.complete();
        }
    }

    /** offer callback */
    _ReceivedAnswer(Answer: IChatNegotitation): void
    {
        console.log('WebRTC: received answer');

        this.PeerConn.setRemoteDescription(Answer.SessionInit as RTCSessionDescriptionInit).then(() =>
        {
            if (TypeInfo.Assigned(Answer.Candidates))
                this._ReceivedCandidate(Answer.Candidates);
        });
    }

    /** candidate callback */
    _ReceivedCandidate(Candidates: RTCIceCandidate | RTCIceCandidate[]): void
    {
        console.log('WebRTC: received candidate(s)');

        if (Candidates instanceof Array)
            Candidates.forEach(c => this.PeerConn.addIceCandidate(c).catch(err => console.log('%c' + err.message, 'color:red')));
        else
            this.PeerConn.addIceCandidate(Candidates).catch(err => console.log('%c' + err.message, 'color:red'));
    }

    override complete(): void
    {
        console.log('%cChat: completed', 'color:lightgreen');

        this._State = TChatState.Hangup;
        this.Dispose();

        super.complete();
    }

    override error(err?: Exception): void
    {
        console.log(`%cChat error: ${err}`, 'color:red');

        this._State = TChatState.Hangup;
        this.Dispose();

        super.error(err);
    }

    override next(State: TChatState): void
    {
        if (this._State !== State)
        {
            console.log(`Chat: state ${TChatState[State]}`);

            this._State = State;
            super.next(this._State);

            if (this._State === TChatState.Established && TypeInfo.Assigned(this.TimeoutId))
            {
                clearTimeout(this.TimeoutId);
                this.TimeoutId = undefined;
            }

            if (this._State === TChatState.Hangup)
            {
                if (TypeInfo.Assigned(this.TimeoutId))
                {
                    clearTimeout(this.TimeoutId);
                    this.TimeoutId = undefined;
                }

                setTimeout(() => this.complete());
            }
        }
    }

    private Initialize(): void
    {
        this.PeerConn.oniceconnectionstatechange = ev => this.HandleICEConnectionStateChange(ev);
        try
        {
            this.PeerConn.ontrack = ev => this.HandleOnTrack(ev);
        }
        catch (e)
        {
            console.log('%cWebRTC ontrack compatiable issue, switch to onaddstream', 'color:orange');

            (this.PeerConn as any).onaddstream = (ev: any) =>
            {
                if (this._Media !== ev.stream)
                this._Media = ev.stream;
            };
        }
    }

    private Dispose(): void
    {
        if (TypeInfo.Assigned(this.TimeoutId))
        {
            clearTimeout(this.TimeoutId);
            this.TimeoutId = undefined;
        }

        console.log('WebRTC: breaking PeerConnection events');
        try { this.PeerConn.onconnectionstatechange = null; } catch (e) {}
        try { this.PeerConn.ondatachannel = null; } catch (e) {}
        try { this.PeerConn.onicecandidate = null; } catch (e) {}
        try { this.PeerConn.onicecandidateerror = null; } catch (e) {}
        try { this.PeerConn.oniceconnectionstatechange = null; } catch (e) {}
        try { this.PeerConn.onicegatheringstatechange = null; } catch (e) {}
        try { this.PeerConn.onnegotiationneeded = null; } catch (e) {}
        try { this.PeerConn.onsignalingstatechange = null; } catch (e) {}
        try { this.PeerConn.ontrack = null; } catch (e) {}

        // free up resources
        console.log('WebRTC: freeup PeerConnection');
        try
        {
            this.PeerConn.close();
            delete (this as any).PeerConn;
        }
        catch (e: any)
        {
            const str = e instanceof Error ?  e.message : e.toString();
            console.log(`%cWebRTC: ${str}`, 'color:red');
        }
        this._Media = null;
    }

    private HandleOnTrack(ev: RTCTrackEvent)
    {
        if (this._Media !== ev.streams[0])
            this._Media = ev.streams[0];

        if (ev.streams.length > 1)
        {
            console.log('%contrack has more then one streams', 'color:orange');
            console.log(ev.streams);
        }
    }

    private HandleICEConnectionStateChange(ev: Event)
    {
        /*
        host offer =>
            client oniceconnectionstatechange: checking
            host oniceconnectionstatechange: checking
            host oniceconnectionstatechange: connected
            host oniceconnectionstatechange: completed
            c1 oniceconnectionstatechange: connected
            host oniceconnectionstatechange: closed
            client oniceconnectionstatechange: disconnected
        if not call PeerConnection.close() =>
            client oniceconnectionstatechange: failed
        */
        const state = this.PeerConn.iceConnectionState;
        console.log(`%cWebRTC: iceConnectionState ${state}`, 'color:orange');

        if (['closed', 'disconnected', 'failed'].indexOf(state) !== -1)
            this.next(TChatState.Hangup);
        else if (state === 'connected')
            this.next(TChatState.Established);
    }

    get Media(): MediaStream | null
    {
        return this._Media;
    }

    get State(): TChatState
    {
        return this._State;
    }

    private PeerConn: RTCPeerConnection;
    private _Media: MediaStream | null = null;
    private _State: TChatState = TChatState.Hangup;
    private TimeoutId?: timeout_t;
}

export abstract class TBaseChatService
{
    constructor()
    {
        console.log(`Chat: loopback calling id ${this.ClientId}`);
    }

    get ClientId(): string
    {
        return this._ClientId;
    }

    GetLocalMedia(ChatOpts: IChatOptions): Promise<MediaStream | undefined>
    {
        const opts: MediaStreamConstraints = {};

        // setup video params
        if (TypeInfo.Assigned(ChatOpts.Video))
        {
            opts.video = true;
        }
        // setup audio params
        if (TypeInfo.Assigned(ChatOpts.Audio))
        {
            (opts.audio as any) = {
                echoCancellation: true,
                noiseSuppression: true,
            };
        }

        console.log(`navigator.mediaDevices.getUserMedia(${JSON.stringify(opts)})`);

        if (TypeInfo.Assigned(ChatOpts.Video) || TypeInfo.Assigned(ChatOpts.Audio))
            return navigator.mediaDevices.getUserMedia(opts);
        else
            return Promise.resolve(undefined);
    }

    SwitchCamera(): void
    {
    }

    VideoCall(ClientId: string, LocalMedia?: MediaStream): TChat
    {
        return this.Call(ClientId, {Video: true, Audio: true}, LocalMedia);
    }

    VoiceCall(ClientId: string, LocalMedia?: MediaStream): TChat
    {
        return this.Call(ClientId, {Audio: true}, LocalMedia);
    }

    Call(ClientId: string, Opts: IChatOptions, LocalMedia?: MediaStream): TChat
    {
        const Chat = this.GetChat(ClientId);

        if (Chat.State === TChatState.Answering)
            Chat.Hangup();

        setTimeout(() =>
        {
            this.GetChat(ClientId).CreateOffer(Opts, LocalMedia).then(negotitation =>
                {
                    negotitation.Audio = Opts.Audio;
                    negotitation.Video = Opts.Video;

                    negotitation.HostId = this._ClientId;
                    negotitation.ClientId = ClientId;

                    console.log('WebRTC: sending offer');
                    return this.TransportNegotitation(negotitation);
                })
                .catch(err =>
                    Chat.Hangup(err));
        });

        return Chat;
    }

    AcceptCall(IncomingCall: IChatIncomingCall, LocalMedia?: MediaStream): TChat
    {
        const Chat = this.GetChat(IncomingCall.HostId);

        Chat.CreateAnswer(IncomingCall, LocalMedia).then(negotitation =>
        {
            console.log('WebRTC: sending answer');
            return this.TransportNegotitation(negotitation);
        })
        .catch(err =>
            Chat.Hangup(err));

        return Chat;
    }

    RejectCall(IncomingCall: IChatIncomingCall): void
    {
        IncomingCall.SessionInit = {type: 'rollback'};
        this.TransportNegotitation(IncomingCall).catch(err => console.log(err));
    }

    protected TransportNegotitation(Negotitation: IChatNegotitation): Promise<void>
    {
        // handle self call
        if (Negotitation.HostId === this._ClientId && Negotitation.ClientId === this._ClientId
            && (Negotitation.SessionInit as RTCSessionDescriptionInit).type === 'offer')
        {
            return this.GetLocalMedia(Negotitation)
                .then(media =>
                {
                    const FakeChat = this.GetChat('local://');
                    console.log('%cloolback chat, we create a fake chat endpoint', 'color:orange');

                    return FakeChat.CreateAnswer(Negotitation as IChatIncomingCall, media);
                })
                .then(Answer => this.HandleNegotitation(Answer));
        }
        else
            return Promise.reject(new ENotImplemented());
    }

    protected HandleNegotitation(Negotitation: IChatNegotitation): void
    {
        if (! TypeInfo.Assigned(Negotitation.HostId))
            throw new EChatNegotitation('no HostId');
        if (! TypeInfo.Assigned(Negotitation.ClientId))
            throw new EChatNegotitation('no ClientId');

        if (TypeInfo.Assigned(Negotitation.SessionInit)) /** still need to check */
        {
            let Chat: TChat;
            if (Negotitation.SessionInit.type === 'offer')
            {
                if (Negotitation.ClientId !== this._ClientId)
                    throw new EChatNegotitation(`server callto wrong ClientId: ${Negotitation.ClientId}, ClientId: ${this._ClientId}`);

                // host offer us
                this.HandleIncomingCall(Negotitation);
            }
            else if (Negotitation.SessionInit.type === 'answer')
            {
                if (Negotitation.HostId !== this._ClientId)
                    throw new EChatNegotitation(`server send wrong answer HostId: ${Negotitation.HostId}, ClientId: ${this._ClientId}`);

                // us is host
                Chat = this.GetChat(Negotitation.ClientId);
                Chat._ReceivedAnswer(Negotitation);
            }
            else if (Negotitation.SessionInit.type === 'rollback')
            {
                Chat = this.GetChat(Negotitation.ClientId);
                Chat.Hangup(new EChatReject());
            }
        }
        else if (TypeInfo.Assigned(Negotitation.Candidates))
        {
            let Chat: TChat | undefined;

            // us is host
            if (Negotitation.HostId === this._ClientId)
                Chat = this.Hash.get(Negotitation.ClientId);
            // us is client
            else
                Chat = this.Hash.get(Negotitation.HostId);

            if (TypeInfo.Assigned(Chat))
                Chat._ReceivedCandidate(Negotitation.Candidates);
        }
        else
            throw new EChatNegotitation('nothing to negotitation');
    }

    protected HandleIncomingCall(Negotitation: IChatNegotitation)
    {
        setTimeout(() => this.OnCallingIn.next(Negotitation as IChatIncomingCall));
    }

    protected GetChat(ClientId: string): TChat
    {
        let Chat = this.Hash.get(ClientId);

        if (! TypeInfo.Assigned(Chat))
        {
            Chat = new TChat();
            this.Hash.set(ClientId, Chat);

            Chat.subscribe(
                next => {},
                err => this.RemoveChat(ClientId),
                () => this.RemoveChat(ClientId)
            );
        }

        return Chat;
    }

    protected RemoveChat(ClientId: string): void
    {
        this.Hash.delete(ClientId);
    }

    OnCallingIn = new Subject<IChatIncomingCall>();

    protected _ClientId = Math.trunc(Math.random() * 100000000).toString(10);
    protected Hash = new Map<string, TChat>();
}

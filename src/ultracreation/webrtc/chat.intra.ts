import {TypeInfo} from '../core/typeinfo';
import {TUtf8Encoding} from '../core/encoding/utf8';
import {TSocketDatagram, TUDPTranscever} from '../native/socket';

import {TBaseChatService, IChatNegotitation} from './chat';
import {THttpServer, THttpConnection, THttpRequest, THttpResponse} from '../native/socket/httpsrv';
import {THttpClient} from '../core/http';
import {lastValueFrom} from 'rxjs';

const UDP_SCHEMA = 'udp://';
const HTTP_SCHEMA = 'http://';

declare module './chat'
{
    interface IChatNegotitation
    {
        Endpoint?: string | THttpResponse;
    }

    interface IChatIncomingCall
    {
        Endpoint: string | THttpResponse;
    }
}

export class TIntraChatService extends TBaseChatService
{
    constructor();
    constructor(Port: number);
    constructor(Port?: number)
    {
        super();

        if (TypeInfo.Assigned(Port))
            setTimeout(() => this.StartLocalServer(Port));
    }

    get LocalConnectAddr(): string | undefined
    {
        if (this.UdpServer.Active)
            return UDP_SCHEMA + this.UdpServer.LocalAddr.SocketAddr;
        else
            return undefined;
    }

    protected override async HandleNegotitation(Negotitation: IChatNegotitation): Promise<void>
    {
        if (TypeInfo.Assigned(Negotitation.Endpoint) &&
            TypeInfo.Assigned(Negotitation.SessionInit) && Negotitation.SessionInit.type === 'offer')
        {
            // incoming offer
            this.HandleIncomingCall(Negotitation);
        }
        else
            return super.HandleNegotitation(Negotitation);
    }

    protected override async TransportNegotitation(Negotitation: IChatNegotitation): Promise<void>
    {
        /** whatever Negotitation from remote address */
        if (TypeInfo.Assigned(Negotitation.Endpoint))
        {
            const Endpoint = Negotitation.Endpoint;
            Negotitation.Endpoint = undefined;

            if (Endpoint instanceof THttpResponse)
            {
                Endpoint.Content = TUtf8Encoding.Encode(JSON.stringify(Negotitation));
                Endpoint.Headers['Content-Type'] = 'application/json';
                Endpoint.Send();
            }
            else
            {
                console.log(`UDP sending to ${Endpoint}`);
                const buf = TUtf8Encoding.Encode(JSON.stringify(Negotitation));
                return this.UdpServer.SendTo(buf, Endpoint).then(bytesent => console.log(`UDP bytes sent ${bytesent}`));
            }
        }
        /** offer from this client */
        else if (Negotitation.HostId === this._ClientId &&
            TypeInfo.Assigned(Negotitation.SessionInit) && Negotitation.SessionInit.type === 'offer')
        {
            // should be an error
            if (! TypeInfo.Assigned(Negotitation.ClientId))
                return super.TransportNegotitation(Negotitation);

            if (Negotitation.ClientId.slice(0, UDP_SCHEMA.length) === UDP_SCHEMA)
            {
                const DestAddr = Negotitation.ClientId.slice(UDP_SCHEMA.length);
                const buf = TUtf8Encoding.Encode(JSON.stringify(Negotitation));

                console.log(`UDP sending to ${DestAddr}`);
                return this.UdpServer.SendTo(buf, DestAddr).then(bytesent => console.log(`UDP bytes sent ${bytesent}`));
            }
            else if (Negotitation.ClientId.slice(0, HTTP_SCHEMA.length) === HTTP_SCHEMA)
            {
                const HttpClient = new THttpClient('json');

                return lastValueFrom(HttpClient.Post(Negotitation.ClientId, Negotitation))
                    .then(rsp => this.HandleNegotitation(rsp.Content));
            }
            else
                super.TransportNegotitation(Negotitation);
        }
        else
            return super.TransportNegotitation(Negotitation);
    }

    private StartLocalServer(Port: number): void
    {
        this.UdpServer = new TUDPTranscever(Port);
        this.HttpServer = new THttpServer(Port + 1);

        this.UdpServer.OnReadReady.subscribe(async next =>
        {
            const Diagram = next as TSocketDatagram;
            console.log(`UDP from ${Diagram.RemoteAddr.SocketAddr} ${Diagram.Buffer.byteLength} bytes`);
            try
            {
                const str = TUtf8Encoding.Decode(Diagram.Buffer);
                const obj = JSON.parse(str);
                obj.Endpoint = Diagram.RemoteAddr.SocketAddr;

                this.HandleNegotitation(obj);
            }
            catch (err)
            {
                console.log(err);
            }
        });

        this.HttpServer.OnReadReady.subscribe(async next =>
        {
            const HttpConn = next as THttpConnection;
            const Request = HttpConn.Request as THttpRequest;

            if (Request.Content.length === 0)
                return HttpConn.CreateResponse(400).Send();

            try
            {
                const str = TUtf8Encoding.Decode(Request.Content);
                const obj = JSON.parse(str);

                obj.Endpoint = HttpConn.CreateResponse(200);
                this.HandleNegotitation(obj);
            }
            catch (err)
            {
                console.log(err);
                HttpConn.CreateResponse(400).Send();
            }
                // console.log(request);
        });

        this.UdpServer.Open()
            .then(() => console.log(`Chat: UDP signaling service at ${Port}`))
            .catch(err => {console.log(`%cChat: UDP fail to start ${err.message}`, 'color:red'); });

        this.HttpServer.Open()
            .then(() => console.log(`Chat: intranet HTTP signaling service at ${Port}`))
            .catch(err => {console.log(`%cChat: HTTP fail to start ${err.message}`, 'color:red'); });
    }

    private UdpServer!: TUDPTranscever;
    private HttpServer!: THttpServer;
}

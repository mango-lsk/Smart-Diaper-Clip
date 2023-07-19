import {TypeInfo} from '../core/typeinfo';
import {TGuid} from '../core/guid';
import {TPersistable} from '../storage/persistable';

/* TAsset */

export class TAsset extends TPersistable implements TPersistable.BeforePersist
{
    constructor(public ObjectName: string)
    {
        super();
    }

    Id = '';
    Name?: string;
    Desc?: string;
    ExtraProps = new Map<string, any>();

    Timestamp = 0;

/* TPersistable */

    protected static override DefineRules(Rules: Array<TPersistable.Rule>): void
    {
        super.DefineRules(Rules);

        Rules.push({Name: 'Asset',
            KeyProps: ['Id'],
            Props: ['ObjectName', 'Name', 'Desc', 'ExtraProps', 'Timestamp'],
            UpdateRule: TPersistable.UpdateRule.WhereKeyOnly
        });
    }

    override MarshallingProp(PropName: string): TypeInfo.Primitive | Date
    {
        switch (PropName)
        {
        case 'ExtraProps':
            const obj: any = {};
            for (const iter of this.ExtraProps)
                obj[iter[0]] = iter[1];
            return JSON.stringify(obj);

        default:
            return super.MarshallingProp(PropName);
        }
    }

    override UnmarshallingProp(PropName: string, Value: TypeInfo.Primitive): void
    {
        switch (PropName)
        {
        case 'ExtraProps':
            if (TypeInfo.IsString(Value))
            {
                const obj = JSON.parse(Value);
                for (const iter in obj)
                    this.ExtraProps.set(iter, obj[iter]);
            }
            else if (TypeInfo.Assigned(Value))
                console.log(`%ExtraProps expect to store as string, but ${typeof Value}`, 'color:red');
            break;

        default:
            super.UnmarshallingProp(PropName, Value);
        }
    }

    async BeforePersist(Transaction?: any): Promise<void>
    {
        this.Id = ('' === this.Id ? TGuid.Generate() : this.Id);
        this.Timestamp = Date.now();
    }
}

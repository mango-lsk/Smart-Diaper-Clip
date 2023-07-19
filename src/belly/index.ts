import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {Bellypage} from './belly';


@NgModule({
    imports: [
        
        RouterModule.forChild([
           {path:'',component:Bellypage},

        ])
        
    ],
})
export class BellyModule {
    
}

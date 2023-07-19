import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

import { DetailsPage } from './details';

@NgModule({
    imports: [
        
        RouterModule.forChild([
           {path:'',component:DetailsPage}
        ]),
    ],
})
export class DetailsModule {

}

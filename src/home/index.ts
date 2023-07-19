import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

import {HomePage} from './home.page';
@NgModule({
    imports: [
        
        RouterModule.forChild([
            {path: '', component: HomePage},
            {path: 'discover',  loadChildren: () => import('../discover/index').then(m => m.DiscoverModule)},
            {path: 'details',  loadChildren: () => import('../details/index').then(m => m.DetailsModule)},
            {path: 'belly', loadChildren: () => import('../belly/index').then(m => m.BellyModule)},
            {path:'temperature-detail',loadChildren: () => import('../temperature-detail/index').then(m => m.TemperatureModule)},
        ]),
    ],
})
export class HomeModule { 

    
}

import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {Temperaturepage} from './temperature';


@NgModule({
    imports: [
        
        RouterModule.forChild([
           {path:'',component:Temperaturepage},
        ])
        
    ],
})
export class TemperatureModule {
    
}


import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

import {DiscoverPage} from './discover';

@NgModule({
    imports: [
        RouterModule.forChild([
            {path: '', component: DiscoverPage},
        ]),
    ],
})
export class DiscoverModule {}

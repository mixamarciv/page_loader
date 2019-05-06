::получаем curpath:
@FOR /f %%i IN ("%0") DO SET curpath=%~dp0
::задаем основные переменные окружения
@CALL "%curpath%/set_path.bat"


@TITLE loader
@CLS
@echo ==== start ===================================================================
::node app.js --port 9301  --cdp_port=9300  --max_pageclients=5

START /D "%curpath%" /B node app.js --port 9301  --cdp_port=9300  --max_pageclients=2
::START /D "%curpath%" /B node app.js --port 9311  --cdp_port=9310  --max_pageclients=2
::START /D "%curpath%" /B node app.js --port 9321  --cdp_port=9320  --max_pageclients=2


::START /D "%curpath%" /B node app.js --port 9401  --cdp_port=9400  --max_pageclients=2
@echo ==== end   ===================================================================
@pause

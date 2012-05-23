@echo off
xcopy src\application.ini ElasticWolf /D /Q
robocopy src\chrome ElasticWolf/chrome /E /njs /nfl /ndl /njh /np
robocopy src\defaults ElasticWolf/defaults /E /njs /nfl /ndl /njh /np
ElasticWolf\ElasticWolf.exe -jsconsole




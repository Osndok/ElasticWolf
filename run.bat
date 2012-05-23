@echo off
if not exist ElasticWolf\chrome mkdir ElasticWolf\chrome 
if not exist ElasticWolf\defaults mkdir ElasticWolf\defaults
xcopy src\application.ini ElasticWolf /D /Q
robocopy src\chrome ElasticWolf/chrome /E /njs /nfl /ndl /njh /np
robocopy src\defaults ElasticWolf/defaults /E /njs /nfl /ndl /njh /np
ElasticWolf\ElasticWolf.exe -jsconsole




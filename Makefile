NAME=ElasticWolf
VER=$(shell awk '{if($$1=="VERSION:"){gsub(/[\"\",;]+/,"",$$2);print $$2;}}' src/chrome/content/client.js)

all:

run:
	$(NAME).app/Contents/MacOS/xulrunner -jsconsole

dev:	clean
	ln -sf `pwd`/src/chrome $(NAME).app/Contents/Resources/chrome 
	ln -sf `pwd`/src/defaults $(NAME).app/Contents/Resources/defaults 
	ln -sf `pwd`/src/application.ini $(NAME).app/Contents/Resources/application.ini

build:	clean build_osx build_win
	make dev

version:
	sed -E -i '' -e "s/^Version=.*$$/Version=$(VER)/" src/application.ini
	sed -E -i '' -e "s/\\<em:version\\>([0-9\\.]*)\\<\\/em:version\\>/\\<em:version\\>$(VER)\\<\\/em:version\\>/" src/install.rdf

build_osx: clean_osx version
	rsync -a src/application.ini src/chrome src/defaults $(NAME).app
	zip -rqy ../$(NAME)-osx-$(VER).zip $(NAME).app

build_win: clean_win version
	rsync -a src/application.ini src/chrome src/defaults $(NAME)
	rsync -u $(NAME)/xulrunner/xulrunner-stub.exe $(NAME)/$(NAME).exe
	zip -rq ../$(NAME)-win-$(VER).zip $(NAME)

xpi:
	(cd src && zip -rq ../$(NAME)-$(VER).xpi .)

clean: clean_osx clean_win
	rm -rf *.zip

clean_osx:
	rm -rf $(NAME).app/Contents/Resources/chrome $(NAME).app/Contents/Resources/defaults

clean_win:
	rm -rf $(NAME)/chrome $(NAME)/defaults $(NAME)/application.ini


